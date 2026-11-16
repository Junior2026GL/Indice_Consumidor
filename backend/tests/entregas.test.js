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

const SUPER = { id: 1, nombre: 'Super', usuario: 'super', rol: 'SUPER_ADMIN' };
const NORMAL = { id: 2, nombre: 'Normal', usuario: 'normal', rol: 'NORMAL' };
const bearer = (u) => `Bearer ${signAccessToken(u)}`;

function mockDb(session) {
  query.mockImplementation(async (sql) => {
    if (sql.includes('WHERE u.id = ? AND u.activo = 1')) return [[session], undefined];
    if (sql.includes('GROUP BY e.usuario_id')) {
      return [
        [
          { usuario_id: 2, nombre: 'Ana', usuario: 'ana', total: '3', primera: '2026-11-15 08:00:00', ultima: '2026-11-15 10:00:00' },
          { usuario_id: 3, nombre: 'Luis', usuario: 'luis', total: '1', primera: '2026-11-15 09:00:00', ultima: '2026-11-15 09:00:00' },
        ],
        undefined,
      ];
    }
    if (sql.includes('COUNT(*) AS total FROM entregas')) return [[{ total: '2' }], undefined];
    if (sql.includes('ORDER BY e.entregado_at DESC')) {
      return [
        [{ id: 9, identificador: '0801199012345', usuario_id: 2, usuario_nombre: 'Ana', entregado_at: '2026-11-15 10:00:00', num: 7, grupo: 3 }],
        undefined,
      ];
    }
    return [[], undefined];
  });
}

beforeEach(() => {
  query.mockReset();
});

describe('/api/entregas', () => {
  it('exige sesión', async () => {
    mockDb(SUPER);
    expect((await request(app).get('/api/entregas')).status).toBe(401);
  });

  it('solo SUPER_ADMIN', async () => {
    mockDb(NORMAL);
    const res = await request(app).get('/api/entregas').set('Authorization', bearer(NORMAL));
    expect(res.status).toBe(403);
  });

  it('resumen: total por usuario y suma general', async () => {
    mockDb(SUPER);
    const res = await request(app).get('/api/entregas/resumen').set('Authorization', bearer(SUPER));
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(4);
    expect(res.body.data.usuarios[0]).toMatchObject({ nombre: 'Ana', total: 3 });
  });

  it('lista con filtros y paginación', async () => {
    mockDb(SUPER);
    const res = await request(app)
      .get('/api/entregas?usuarioId=2&desde=2026-11-01&hasta=2026-11-30&q=0801&page=1')
      .set('Authorization', bearer(SUPER));
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.items[0]).toMatchObject({ identificador: '0801199012345', usuario_nombre: 'Ana' });

    const listCall = query.mock.calls.find(([sql]) => sql.includes('ORDER BY e.entregado_at DESC'));
    expect(listCall[1]).toEqual([2, '2026-11-01 00:00:00', '2026-11-30 23:59:59', '0801%', 20, 0]);
  });

  it('rechaza fechas y DNI inválidos', async () => {
    mockDb(SUPER);
    expect((await request(app).get('/api/entregas?desde=ayer').set('Authorization', bearer(SUPER))).status).toBe(400);
    expect((await request(app).get('/api/entregas?q=abc').set('Authorization', bearer(SUPER))).status).toBe(400);
  });
});
