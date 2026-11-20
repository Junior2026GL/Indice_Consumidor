import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const query = vi.fn();
vi.mock('../src/infrastructure/database/mysql.js', () => ({
  db: { query: (...args) => query(...args), end: vi.fn() },
  pingDatabase: vi.fn().mockResolvedValue(undefined),
  withTransaction: vi.fn(),
}));

const { app } = await import('../src/app.js');
const { signAccessToken } = await import('../src/shared/middleware/auth.middleware.js');

const TUTOR = { id: 2, nombre: 'Ana Pérez', usuario: 'ana', rol: 'NORMAL' };
const SUPER = { id: 1, nombre: 'Super', usuario: 'super', rol: 'SUPER_ADMIN' };
const DNI = '0801199012345';
const ROW = { num: 7, grupo: 3, identificador: DNI, cuenta_occidente: '12-345-678' };
// Fila de la BD (con el dueño de la entrega) y lo que el servidor devuelve al cliente (TUTOR es el dueño).
const ENTREGA = { entregado_at: '2026-11-15 16:35:00', usuario_id: TUTOR.id, entregado_por: 'Ana Pérez' };
const PUBLICA = { entregado_at: ENTREGA.entregado_at, entregado_por: 'Ana Pérez', puede_anular: true };

const bearer = (user) => `Bearer ${signAccessToken(user)}`;

/** Simula la BD. `entrega` = fila existente en `entregas` (o null); `dup` = el INSERT choca con la clave única. */
function mockDb({ session = TUTOR, beneficiarios = [ROW], entrega = null, dup = false, deleted = 1 } = {}) {
  query.mockImplementation(async (sql, params) => {
    if (sql.includes('WHERE u.id = ? AND u.activo = 1')) return [session ? [session] : [], undefined];
    if (sql.includes('FROM beneficiarios')) return [beneficiarios, undefined];
    if (sql.includes('DELETE FROM entregas')) {
      // Borrado limitado al dueño (AND usuario_id = ?): solo afecta si la entrega es de ese usuario.
      if (sql.includes('AND usuario_id')) {
        return [{ affectedRows: entrega && entrega.usuario_id === params[1] ? 1 : 0 }, undefined];
      }
      return [{ affectedRows: deleted }, undefined];
    }
    if (sql.includes('SELECT e.entregado_at')) return [entrega ? [entrega] : [], undefined];
    if (sql.includes('INSERT INTO entregas')) {
      if (dup) throw Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' });
      return [{ affectedRows: 1 }, undefined];
    }
    return [[], undefined];
  });
}

const as = (user) => ({ Authorization: bearer(user) });
const audits = () =>
  query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO auditoria')).map(([, params]) => params);
const touched = (fragment) => query.mock.calls.some(([sql]) => sql.includes(fragment));

beforeEach(() => {
  query.mockReset();
  mockDb();
});

describe('GET /api/beneficiarios/buscar', () => {
  const get = (dni, user = TUTOR) =>
    request(app).get('/api/beneficiarios/buscar').query({ dni }).set(as(user));

  it('exige iniciar sesión (401) y no toca la tabla', async () => {
    const res = await request(app).get(`/api/beneficiarios/buscar?dni=${DNI}`);
    expect(res.status).toBe(401);
    expect(touched('FROM beneficiarios')).toBe(false);
  });

  it('un usuario desactivado ya no puede consultar', async () => {
    mockDb({ session: null });
    expect((await get(DNI)).status).toBe(401);
  });

  it('un usuario con rol NORMAL puede consultar; sin entrega, entrega=null', async () => {
    const res = await get(DNI);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ encontrado: true, items: [{ ...ROW, entrega: null }] });
  });

  it('si ya fue entregado, devuelve fecha, hora y quién lo marcó', async () => {
    mockDb({ entrega: ENTREGA });
    const res = await get(DNI);
    expect(res.body.data.items[0].entrega).toEqual(PUBLICA);
  });

  it('puede_anular: solo el dueño de la entrega y el Super Admin', async () => {
    const OTRO = { id: 9, nombre: 'Otro', usuario: 'otro', rol: 'NORMAL' };
    mockDb({ entrega: ENTREGA, session: OTRO });
    expect((await get(DNI, OTRO)).body.data.items[0].entrega.puede_anular).toBe(false);
    mockDb({ entrega: ENTREGA, session: SUPER });
    expect((await get(DNI, SUPER)).body.data.items[0].entrega.puede_anular).toBe(true);
  });

  it.each(['', '123', '08011990123456', '08011990abcde', '0801-1990-12345', "' OR 1=1 --"])(
    'rechaza el DNI inválido "%s" sin consultar la tabla',
    async (dni) => {
      expect((await get(dni)).status).toBe(400);
      expect(touched('FROM beneficiarios')).toBe(false);
    }
  );

  it('busca el DNI exacto con parámetros (no concatena SQL)', async () => {
    await get(DNI);
    const [sql, params] = query.mock.calls.find(([s]) => s.includes('FROM beneficiarios'));
    expect(params).toEqual([DNI]);
    expect(sql).not.toContain(DNI);
  });

  it('sin coincidencias responde 200 con encontrado=false (y no consulta entregas)', async () => {
    mockDb({ beneficiarios: [] });
    const res = await get(DNI);
    expect(res.body.data).toEqual({ encontrado: false, items: [] });
    expect(touched('SELECT e.entregado_at')).toBe(false);
  });

  it('audita quién consultó, con el DNI enmascarado', async () => {
    await get(DNI);
    const consulta = audits().find((p) => p[1] === 'CONSULTAR');
    expect(consulta[0]).toBe(TUTOR.id);
    expect(consulta[3]).toContain('*********2345');
    expect(consulta[3]).not.toContain(DNI);
  });
});

describe('POST /api/beneficiarios/entrega', () => {
  const post = (body, user = TUTOR) =>
    request(app).post('/api/beneficiarios/entrega').set(as(user)).send(body);

  it('exige sesión', async () => {
    expect((await request(app).post('/api/beneficiarios/entrega').send({ dni: DNI })).status).toBe(401);
  });

  it('registra la entrega con el usuario que la marcó y la audita', async () => {
    mockDb({ entrega: ENTREGA });
    const res = await post({ dni: DNI });

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual(PUBLICA);

    const [, params] = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO entregas'));
    expect(params).toEqual([DNI, TUTOR.id]);

    const log = audits().find((p) => p[1] === 'ENTREGAR');
    expect(log[0]).toBe(TUTOR.id);
    expect(log[3]).toContain('*********2345');
    expect(log[3]).not.toContain(DNI);
  });

  it('no se puede entregar dos veces: 409 y nada se audita como entrega', async () => {
    mockDb({ dup: true });
    const res = await post({ dni: DNI });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/ya fue marcado/i);
    expect(audits().some((p) => p[1] === 'ENTREGAR')).toBe(false);
  });

  it('un DNI que no está en la tabla: 404 y no inserta', async () => {
    mockDb({ beneficiarios: [] });
    expect((await post({ dni: DNI })).status).toBe(404);
    expect(touched('INSERT INTO entregas')).toBe(false);
  });

  it.each([{}, { dni: '123' }, { dni: 'abc' }])('valida el cuerpo %j', async (body) => {
    expect((await post(body)).status).toBe(400);
    expect(touched('INSERT INTO entregas')).toBe(false);
  });

  it('ignora campos extra: el usuario sale de la sesión, no del cuerpo', async () => {
    mockDb({ entrega: ENTREGA });
    await post({ dni: DNI, usuario_id: 999 });
    const [, params] = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO entregas'));
    expect(params[1]).toBe(TUTOR.id);
  });
});

describe('DELETE /api/beneficiarios/entrega/:dni (anular)', () => {
  const del = (user, dni = DNI) => request(app).delete(`/api/beneficiarios/entrega/${dni}`).set(as(user));

  it('un usuario NORMAL anula una entrega que registró él mismo', async () => {
    mockDb({ session: TUTOR, entrega: ENTREGA });
    expect((await del(TUTOR)).status).toBe(200);
    const [, params] = query.mock.calls.find(([sql]) => sql.includes('DELETE FROM entregas'));
    expect(params).toEqual([DNI, TUTOR.id]);
    expect(audits().some((p) => p[1] === 'ANULAR_ENTREGA' && p[0] === TUTOR.id)).toBe(true);
  });

  it('un usuario NORMAL no puede anular la entrega de otra persona (403)', async () => {
    const OTRO = { id: 9, nombre: 'Otro', usuario: 'otro', rol: 'NORMAL' };
    mockDb({ session: OTRO, entrega: ENTREGA });
    const res = await del(OTRO);
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/registraste tú/i);
    expect(audits().some((p) => p[1] === 'ANULAR_ENTREGA')).toBe(false);
  });

  it('un usuario NORMAL sin entrega registrada: 404', async () => {
    mockDb({ session: TUTOR, entrega: null });
    expect((await del(TUTOR)).status).toBe(404);
  });

  it('el Super Admin anula la de cualquiera y queda auditado', async () => {
    mockDb({ session: SUPER });
    expect((await del(SUPER)).status).toBe(200);
    expect(audits().some((p) => p[1] === 'ANULAR_ENTREGA' && p[0] === SUPER.id)).toBe(true);
  });

  it('sin entrega registrada: 404', async () => {
    mockDb({ session: SUPER, deleted: 0 });
    expect((await del(SUPER)).status).toBe(404);
  });

  it('valida el DNI de la ruta', async () => {
    mockDb({ session: SUPER });
    expect((await del(SUPER, '123')).status).toBe(400);
  });
});

describe('GET /api/beneficiarios/indemnizacion', () => {
  const INDEM = { numero: 5, identificador: DNI, nombre: 'Juan López', indemnizacion: '12345.67890000' };
  const get = (dni) => request(app).get('/api/beneficiarios/indemnizacion').query({ dni }).set(as(TUTOR));

  it('exige iniciar sesión (401)', async () => {
    const res = await request(app).get(`/api/beneficiarios/indemnizacion?dni=${DNI}`);
    expect(res.status).toBe(401);
    expect(touched('indemnizacion_ipc_insep')).toBe(false);
  });

  it('rechaza un DNI que no tiene 13 dígitos (400)', async () => {
    const res = await get('123');
    expect(res.status).toBe(400);
    expect(touched('indemnizacion_ipc_insep')).toBe(false);
  });

  it('devuelve los datos y audita con el DNI enmascarado', async () => {
    query.mockImplementation(async (sql) => {
      if (sql.includes('WHERE u.id = ? AND u.activo = 1')) return [[TUTOR], undefined];
      if (sql.includes('FROM indemnizacion_ipc_insep')) return [[INDEM], undefined];
      return [[], undefined];
    });
    const res = await get(DNI);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ encontrado: true, items: [INDEM], truncado: false });
    expect(JSON.stringify(audits())).not.toContain(DNI);
  });

  it('sin registro devuelve encontrado: false', async () => {
    const res = await get(DNI);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ encontrado: false, items: [], truncado: false });
  });
});

describe('GET /api/beneficiarios/indemnizacion por nombre', () => {
  const INDEM = { numero: 5, identificador: DNI, nombre: 'Juan López', indemnizacion: '12345.67890000' };
  const get = (q) => request(app).get('/api/beneficiarios/indemnizacion').query(q).set(as(TUTOR));
  const mockRows = (rows) =>
    query.mockImplementation(async (sql) => {
      if (sql.includes('WHERE u.id = ? AND u.activo = 1')) return [[TUTOR], undefined];
      if (sql.includes('FROM indemnizacion_ipc_insep')) return [rows, undefined];
      return [[], undefined];
    });

  it('rechaza nombres de menos de 3 letras y pedir DNI y nombre a la vez (400)', async () => {
    expect((await get({ nombre: 'ju' })).status).toBe(400);
    expect((await get({ nombre: 'juan', dni: DNI })).status).toBe(400);
    expect((await get({})).status).toBe(400);
  });

  it('busca cada palabra con LIKE escapado', async () => {
    mockRows([INDEM]);
    const res = await get({ nombre: 'juan 50%' });
    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([INDEM]);
    const call = query.mock.calls.find(([sql]) => sql.includes('FROM indemnizacion_ipc_insep'));
    expect(call[1]).toEqual(['%juan%', '%50\\%%', 21]);
  });

  it('marca truncado cuando hay más de 20 coincidencias', async () => {
    mockRows(Array.from({ length: 21 }, (_, i) => ({ ...INDEM, identificador: String(i) })));
    const res = await get({ nombre: 'juan' });
    expect(res.body.data.items).toHaveLength(20);
    expect(res.body.data.truncado).toBe(true);
  });
});
