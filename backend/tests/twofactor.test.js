import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const query = vi.fn();
vi.mock('../src/infrastructure/database/mysql.js', () => ({
  db: { query: (...args) => query(...args), end: vi.fn() },
  pingDatabase: vi.fn().mockResolvedValue(undefined),
  withTransaction: vi.fn(),
}));

const { app } = await import('../src/app.js');
const { withTransaction } = await import('../src/infrastructure/database/mysql.js');
const { env } = await import('../src/config/env.js');
const { signAccessToken } = await import('../src/shared/middleware/auth.middleware.js');
const { generateSecret, verifyTotp, base32Decode, base32Encode, _hotp, stepAt } =
  await import('../src/shared/utils/totp.js');
const crypto = await import('../src/shared/utils/crypto.js');

const SUPER = { id: 1, nombre: 'Super', usuario: 'super', rol: 'SUPER_ADMIN' };
const NORMAL = { id: 2, nombre: 'Normal', usuario: 'normal', rol: 'NORMAL' };
const PASSWORD = 'Admin2026ok';
const SECRET = generateSecret();
const ENC = crypto.encryptSecret(SECRET, env.auth.totpEncryptionKey);
const nowCode = (offset = 0) => _hotp(SECRET, stepAt() + offset);

const bearer = (user) => `Bearer ${signAccessToken(user)}`;
const challenge = (id = SUPER.id) =>
  jwt.sign({ purpose: '2fa' }, env.auth.jwtSecret, {
    algorithm: 'HS256',
    subject: String(id),
    issuer: env.auth.jwtIssuer,
    audience: 'ipc-insep-2fa',
    expiresIn: 300,
  });

/** Simula la BD según el SQL. `state` = fila de findTwoFactorState; `backupOk` = el UPDATE del código de respaldo afecta una fila. */
function mockDb({ state, passwordHash, claim = true, backupOk = false, session = SUPER } = {}) {
  query.mockImplementation(async (sql) => {
    if (sql.includes('u.totp_secret')) return [state ? [state] : [], undefined];
    if (sql.includes('u.password_hash') && sql.includes('WHERE u.usuario')) {
      return [
        [{ ...SUPER, password_hash: passwordHash, activo: 1, bloqueado: 0, totp_enabled: 1 }],
        undefined,
      ];
    }
    if (sql.includes('SELECT id, password_hash'))
      return [[{ id: 1, password_hash: passwordHash }], undefined];
    if (sql.includes('WHERE u.id = ? AND u.activo = 1')) return [session ? [session] : [], undefined];
    if (sql.includes('SET totp_last_step')) return [{ affectedRows: claim ? 1 : 0 }, undefined];
    if (sql.includes('usuario_backup_codes')) return [{ affectedRows: backupOk ? 1 : 0 }, undefined];
    return [{ affectedRows: 1 }, undefined];
  });
}

const ran = (fragment) => query.mock.calls.some(([sql]) => sql.includes(fragment));
const audits = () =>
  query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO auditoria')).map(([, params]) => params);

const baseState = (extra = {}) => ({
  ...SUPER,
  totp_secret: ENC,
  totp_enabled: 1,
  totp_last_step: null,
  bloqueado: 0,
  ...extra,
});

let passwordHash;
beforeEach(async () => {
  query.mockReset();
  withTransaction.mockReset();
  passwordHash ||= await bcrypt.hash(PASSWORD, 4);
});

describe('TOTP (RFC 6238)', () => {
  it('coincide con el vector de prueba oficial (secreto "12345678901234567890", t=59 s)', () => {
    const secret = base32Encode(Buffer.from('12345678901234567890'));
    expect(secret).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
    expect(verifyTotp(secret, '287082', { nowMs: 59_000 })).toBe(1);
    expect(base32Decode(secret).toString()).toBe('12345678901234567890');
  });

  it('admite ±1 intervalo y rechaza lo demás', () => {
    const now = 1_700_000_000_000;
    const step = stepAt(now);
    expect(verifyTotp(SECRET, _hotp(SECRET, step - 1), { nowMs: now })).toBe(step - 1);
    expect(verifyTotp(SECRET, _hotp(SECRET, step + 1), { nowMs: now })).toBe(step + 1);
    expect(verifyTotp(SECRET, _hotp(SECRET, step - 2), { nowMs: now })).toBeNull();
    expect(verifyTotp(SECRET, 'abcdef', { nowMs: now })).toBeNull();
    expect(verifyTotp(SECRET, '12345', { nowMs: now })).toBeNull();
  });
});

describe('cifrado y códigos de respaldo', () => {
  it('cifra y descifra, y detecta alteraciones o una clave distinta', () => {
    const enc = crypto.encryptSecret('hola', 'clave-de-prueba-de-32-caracteres-o-mas');
    expect(enc).not.toContain('hola');
    expect(crypto.decryptSecret(enc, 'clave-de-prueba-de-32-caracteres-o-mas')).toBe('hola');
    expect(() => crypto.decryptSecret(enc, 'otra-clave-de-prueba-de-32-caracteres')).toThrow();
    expect(() => crypto.decryptSecret(`${enc}x`, 'clave-de-prueba-de-32-caracteres-o-mas')).toThrow();
  });

  it('genera 8 códigos distintos y los compara sin importar guiones ni mayúsculas', () => {
    const codes = crypto.generateBackupCodes();
    expect(codes).toHaveLength(8);
    expect(new Set(codes).size).toBe(8);
    expect(codes[0]).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
    expect(crypto.hashBackupCode(codes[0])).toBe(
      crypto.hashBackupCode(codes[0].toLowerCase().replace('-', ' '))
    );
  });
});

describe('login con verificación en dos pasos', () => {
  it('paso 1: con 2FA activo no entrega sesión ni cookie, solo un token de verificación', async () => {
    mockDb({ passwordHash });
    const res = await request(app).post('/api/auth/login').send({ usuario: 'super', password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data.requires2fa).toBe(true);
    expect(res.body.data.challengeToken).toBeTruthy();
    expect(res.body.data.token).toBeUndefined();
    expect(res.headers['set-cookie']).toBeUndefined();
    expect(ran('INSERT INTO refresh_tokens')).toBe(false);
  });

  it('paso 2: un código correcto abre la sesión', async () => {
    mockDb({ state: baseState() });
    const res = await request(app)
      .post('/api/auth/login/2fa')
      .send({ challengeToken: challenge(), code: nowCode() });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.headers['set-cookie'].some((c) => c.startsWith('ipc_refresh='))).toBe(true);
    expect(ran('SET totp_last_step')).toBe(true);
    expect(audits().some(([, accion]) => accion === 'LOGIN')).toBe(true);
  });

  it('un código incorrecto da 401, suma un intento fallido y queda en la bitácora', async () => {
    mockDb({ state: baseState() });
    const wrong = nowCode() === '000000' ? '111111' : '000000';
    const res = await request(app)
      .post('/api/auth/login/2fa')
      .send({ challengeToken: challenge(), code: wrong });

    expect(res.status).toBe(401);
    expect(res.body.data).toBeUndefined();
    expect(ran('intentos_fallidos + 1')).toBe(true);
    expect(audits().some(([, accion]) => accion === 'LOGIN_FALLIDO')).toBe(true);
  });

  it('un código ya usado no sirve de nuevo (anti-repetición)', async () => {
    mockDb({ state: baseState({ totp_last_step: stepAt() + 5 }) });
    const res = await request(app)
      .post('/api/auth/login/2fa')
      .send({ challengeToken: challenge(), code: nowCode() });
    expect(res.status).toBe(401);
  });

  it('dos intentos simultáneos con el mismo código: solo gana uno', async () => {
    mockDb({ state: baseState(), claim: false });
    const res = await request(app)
      .post('/api/auth/login/2fa')
      .send({ challengeToken: challenge(), code: nowCode() });
    expect(res.status).toBe(401);
  });

  it('acepta un código de respaldo una sola vez', async () => {
    mockDb({ state: baseState(), backupOk: true });
    const ok = await request(app)
      .post('/api/auth/login/2fa')
      .send({ challengeToken: challenge(), code: 'ABCDE-FGHJK' });
    expect(ok.status).toBe(200);

    mockDb({ state: baseState(), backupOk: false });
    const used = await request(app)
      .post('/api/auth/login/2fa')
      .send({ challengeToken: challenge(), code: 'ABCDE-FGHJK' });
    expect(used.status).toBe(401);
  });

  it('cuenta bloqueada: 429 sin probar el código', async () => {
    mockDb({ state: baseState({ bloqueado: 1, minutos_bloqueo: 9 }) });
    const res = await request(app)
      .post('/api/auth/login/2fa')
      .send({ challengeToken: challenge(), code: nowCode() });
    expect(res.status).toBe(429);
    expect(ran('SET totp_last_step')).toBe(false);
  });

  it('el token de verificación no sirve como token de acceso, ni al revés', async () => {
    mockDb({ state: baseState() });
    const asAccess = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${challenge()}`);
    expect(asAccess.status).toBe(401);

    const accessAsChallenge = await request(app)
      .post('/api/auth/login/2fa')
      .send({ challengeToken: signAccessToken(SUPER), code: nowCode() });
    expect(accessAsChallenge.status).toBe(401);

    const garbage = await request(app)
      .post('/api/auth/login/2fa')
      .send({ challengeToken: 'basura', code: nowCode() });
    expect(garbage.status).toBe(401);
  });
});

describe('configurar la verificación en dos pasos', () => {
  const post = (path, body, user = SUPER) =>
    request(app).post(`/api/auth/2fa/${path}`).set('Authorization', bearer(user)).send(body);

  it('exige sesión y rol Super Admin', async () => {
    mockDb({ session: NORMAL });
    expect((await request(app).post('/api/auth/2fa/setup').send({ password: PASSWORD })).status).toBe(401);
    expect((await post('setup', { password: PASSWORD }, NORMAL)).status).toBe(403);
    expect((await post('enable', { code: '123456' }, NORMAL)).status).toBe(403);
    expect((await post('disable', { password: PASSWORD, code: '123456' }, NORMAL)).status).toBe(403);
  });

  it('setup: pide la contraseña, entrega QR y guarda el secreto cifrado', async () => {
    mockDb({ state: baseState({ totp_enabled: 0, totp_secret: null }), passwordHash });

    const bad = await post('setup', { password: 'incorrecta' });
    expect(bad.status).toBe(400);

    const res = await post('setup', { password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.data.secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(res.body.data.qr).toMatch(/^data:image\/png;base64,/);
    expect(res.body.data.otpauthUrl).toContain('otpauth://totp/IPC%20INSEP');

    const save = query.mock.calls.find(([sql]) => sql.includes('SET totp_secret'));
    expect(save[1][0]).not.toContain(res.body.data.secret); // en la BD va cifrado
    expect(crypto.decryptSecret(save[1][0], env.auth.totpEncryptionKey)).toBe(res.body.data.secret);
  });

  it('setup: si ya está activo responde 409', async () => {
    mockDb({ state: baseState(), passwordHash });
    expect((await post('setup', { password: PASSWORD })).status).toBe(409);
  });

  it('enable: con un código real activa el 2FA y entrega 8 códigos de respaldo', async () => {
    mockDb({ state: baseState({ totp_enabled: 0 }) });
    const res = await post('enable', { code: nowCode() });

    expect(res.status).toBe(200);
    expect(res.body.data.backupCodes).toHaveLength(8);
    expect(withTransaction).toHaveBeenCalledTimes(1);
    expect(audits().some(([, accion]) => accion === 'ACTIVAR_2FA')).toBe(true);
  });

  it('enable: un código incorrecto no activa nada', async () => {
    mockDb({ state: baseState({ totp_enabled: 0 }) });
    const wrong = nowCode() === '000000' ? '111111' : '000000';
    const res = await post('enable', { code: wrong });

    expect(res.status).toBe(400);
    expect(withTransaction).not.toHaveBeenCalled();
  });

  it('disable: exige contraseña y código; con ambos correctos desactiva y queda en la bitácora', async () => {
    mockDb({ state: baseState(), passwordHash });
    expect((await post('disable', { password: 'incorrecta', code: nowCode() })).status).toBe(400);
    expect(withTransaction).not.toHaveBeenCalled();

    const wrong = nowCode() === '000000' ? '111111' : '000000';
    expect((await post('disable', { password: PASSWORD, code: wrong })).status).toBe(400);
    expect(withTransaction).not.toHaveBeenCalled();

    const res = await post('disable', { password: PASSWORD, code: nowCode() });
    expect(res.status).toBe(200);
    expect(withTransaction).toHaveBeenCalledTimes(1);
    expect(audits().some(([, accion]) => accion === 'DESACTIVAR_2FA')).toBe(true);
  });
});
