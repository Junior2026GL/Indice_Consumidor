import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';

// La base de datos se simula: estas pruebas verifican HTTP, seguridad y reglas, no SQL.
const query = vi.fn();
vi.mock('../src/infrastructure/database/mysql.js', () => ({
  db: { query: (...args) => query(...args), end: vi.fn() },
  pingDatabase: vi.fn().mockResolvedValue(undefined),
  withTransaction: vi.fn(),
}));

const { app } = await import('../src/app.js');
const { signAccessToken } = await import('../src/shared/middleware/auth.middleware.js');

const SUPER = { id: 1, nombre: 'Super', usuario: 'super', rol: 'SUPER_ADMIN' };
const NORMAL = { id: 2, nombre: 'Normal', usuario: 'normal', rol: 'NORMAL' };

const bearer = (user) => `Bearer ${signAccessToken(user)}`;

/** Responde a las consultas según el SQL; lo no previsto devuelve vacío. */
function mockDb(handlers = {}) {
  query.mockImplementation(async (sql) => {
    for (const [fragment, result] of Object.entries(handlers)) {
      if (sql.includes(fragment)) return typeof result === 'function' ? result(sql) : result;
    }
    return [[], undefined];
  });
}

beforeEach(() => {
  query.mockReset();
  mockDb();
});

describe('infraestructura HTTP', () => {
  it('GET /api/health responde y no expone el stack', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-request-id']).toBeTruthy();
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
  });

  it('GET /api/health/ready consulta la BD', async () => {
    const res = await request(app).get('/api/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.database).toBe('up');
  });

  it('ruta inexistente: 401 sin sesión (no revela qué rutas existen)', async () => {
    const res = await request(app).get('/api/no-existe');
    expect(res.status).toBe(401);
  });

  it('ruta inexistente con sesión: 404 sin reflejar la URL', async () => {
    mockDb({ 'WHERE u.id = ? AND u.activo = 1': [[SUPER], undefined] });
    const res = await request(app).get('/api/no-existe<script>').set('Authorization', bearer(SUPER));
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain('script');
  });

  it('JSON malformado devuelve 400 limpio', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"usuario":');
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('rechaza orígenes CORS no autorizados', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://evil.example');
    expect(res.status).toBe(403);
  });

  it('acepta el origen configurado', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });
});

describe('autenticación y autorización', () => {
  it('sin token -> 401', async () => {
    expect((await request(app).get('/api/users')).status).toBe(401);
  });

  it('token manipulado -> 401', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `${bearer(SUPER)}x`);
    expect(res.status).toBe(401);
  });

  it('token con algoritmo "none" -> 401', async () => {
    const header = Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url');
    const body = Buffer.from('{"sub":"1","iss":"ipc-insep-api","aud":"ipc-insep-web"}').toString('base64url');
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${header}.${body}.`);
    expect(res.status).toBe(401);
  });

  it('token válido de un usuario desactivado/inexistente -> 401', async () => {
    mockDb({ 'WHERE u.id = ? AND u.activo = 1': [[], undefined] });
    const res = await request(app).get('/api/users').set('Authorization', bearer(SUPER));
    expect(res.status).toBe(401);
  });

  it('usa el rol de la BD, no el del token: NORMAL no entra a /users', async () => {
    mockDb({ 'WHERE u.id = ? AND u.activo = 1': [[NORMAL], undefined] });
    const res = await request(app).get('/api/users').set('Authorization', bearer(SUPER));
    expect(res.status).toBe(403);
  });

  it('SUPER_ADMIN lista usuarios con paginación y resumen', async () => {
    mockDb({
      'WHERE u.id = ? AND u.activo = 1': [[SUPER], undefined],
      'COUNT(*) AS total\n     FROM usuarios': [[{ total: 1 }], undefined],
      'SUM(u.activo = 1)': [[{ total: 1, activos: 1, inactivos: 0, administradores: 1 }], undefined],
      'ORDER BY u.id DESC': [[{ id: 1, nombre: 'Super', usuario: 'super', rol: 'SUPER_ADMIN' }], undefined],
    });
    const res = await request(app).get('/api/users?page=1&pageSize=10').set('Authorization', bearer(SUPER));
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.stats.administradores).toBe(1);
  });

  it('valida el id de la ruta (400, sin tocar la BD)', async () => {
    mockDb({ 'WHERE u.id = ? AND u.activo = 1': [[SUPER], undefined] });
    const res = await request(app).get('/api/users/abc').set('Authorization', bearer(SUPER));
    expect(res.status).toBe(400);
  });

  it('no permite activo no booleano', async () => {
    mockDb({ 'WHERE u.id = ? AND u.activo = 1': [[SUPER], undefined] });
    const res = await request(app)
      .patch('/api/users/5/estado')
      .set('Authorization', bearer(SUPER))
      .send({ activo: 'false' });
    expect(res.status).toBe(400);
  });
});

describe('login', () => {
  it('valida el cuerpo', async () => {
    const res = await request(app).post('/api/auth/login').send({ usuario: '' });
    expect(res.status).toBe(400);
  });

  it('credenciales correctas: token en el cuerpo y refresh en cookie HttpOnly', async () => {
    const password_hash = await bcrypt.hash('Admin2026ok', 4);
    mockDb({
      'FROM usuarios u': [[{ ...SUPER, password_hash, activo: 1, bloqueado: 0 }], undefined],
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ usuario: 'super', password: 'Admin2026ok' });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user).toEqual({
      id: 1,
      nombre: 'Super',
      usuario: 'super',
      rol: 'SUPER_ADMIN',
      two_factor: false,
    });
    expect(JSON.stringify(res.body)).not.toContain('password');

    const cookie = res.headers['set-cookie'].find((c) => c.startsWith('ipc_refresh='));
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Path=\/api\/auth/);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it('contraseña incorrecta: 401 genérico y cuenta intento fallido', async () => {
    const password_hash = await bcrypt.hash('Admin2026ok', 4);
    mockDb({
      'FROM usuarios u': [[{ ...SUPER, password_hash, activo: 1, bloqueado: 0 }], undefined],
    });
    const res = await request(app).post('/api/auth/login').send({ usuario: 'super', password: 'incorrecta' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Usuario o contraseña incorrectos');
    expect(query.mock.calls.some(([sql]) => sql.includes('intentos_fallidos + 1'))).toBe(true);
  });

  it('usuario inexistente: mismo mensaje que contraseña incorrecta', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ usuario: 'fantasma', password: 'loquesea' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Usuario o contraseña incorrectos');
  });

  it('cuenta bloqueada: 429 sin verificar la contraseña', async () => {
    mockDb({
      'FROM usuarios u': [
        [{ ...SUPER, password_hash: 'x', activo: 1, bloqueado: 1, minutos_bloqueo: 7 }],
        undefined,
      ],
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ usuario: 'super', password: 'Admin2026ok' });
    expect(res.status).toBe(429);
    expect(res.body.message).toContain('7 minuto');
  });
});

describe('refresh y logout', () => {
  it('refresh sin cabecera X-Requested-With -> 403 (defensa CSRF)', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(403);
  });

  it('refresh sin cookie -> 401', async () => {
    const res = await request(app).post('/api/auth/refresh').set('X-Requested-With', 'XMLHttpRequest');
    expect(res.status).toBe(401);
  });

  it('reutilizar un refresh token ya rotado revoca toda la familia', async () => {
    mockDb({
      'FROM refresh_tokens': [
        [{ id: 9, usuario_id: 1, family_id: 'fam-1', revoked: 1, revoked_seconds_ago: 3600, expired: 0 }],
        undefined,
      ],
    });
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('X-Requested-With', 'XMLHttpRequest')
      .set('Cookie', 'ipc_refresh=token-robado');

    expect(res.status).toBe(401);
    expect(query.mock.calls.some(([sql]) => sql.includes('WHERE family_id = ?'))).toBe(true);
  });

  it('dos pestañas renovando a la vez no se tratan como robo', async () => {
    mockDb({
      'FROM refresh_tokens': [
        [{ id: 9, usuario_id: 1, family_id: 'fam-1', revoked: 1, revoked_seconds_ago: 2, expired: 0 }],
        undefined,
      ],
    });
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('X-Requested-With', 'XMLHttpRequest')
      .set('Cookie', 'ipc_refresh=token');

    expect(res.status).toBe(401);
    expect(query.mock.calls.some(([sql]) => sql.includes('WHERE family_id = ?'))).toBe(false);
  });

  it('refresh válido rota el token y emite uno nuevo', async () => {
    mockDb({
      'FROM refresh_tokens': [
        [{ id: 9, usuario_id: 1, family_id: 'fam-1', revoked: 0, revoked_seconds_ago: null, expired: 0 }],
        undefined,
      ],
      'WHERE u.id = ? AND u.activo = 1': [[SUPER], undefined],
      'SET revoked_at = NOW() WHERE id = ?': [{ affectedRows: 1 }, undefined],
    });
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('X-Requested-With', 'XMLHttpRequest')
      .set('Cookie', 'ipc_refresh=token-bueno');

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.headers['set-cookie'].some((c) => c.startsWith('ipc_refresh=') && /HttpOnly/i.test(c))).toBe(
      true
    );
  });

  it('logout limpia la cookie', async () => {
    const res = await request(app).post('/api/auth/logout').set('X-Requested-With', 'XMLHttpRequest');
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie'].some((c) => c.startsWith('ipc_refresh=;'))).toBe(true);
  });
});
