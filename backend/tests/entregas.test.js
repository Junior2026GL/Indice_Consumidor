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
          {
            usuario_id: 2,
            nombre: 'Ana',
            usuario: 'ana',
            total: '3',
            primera: '2026-11-15 08:00:00',
            ultima: '2026-11-15 10:00:00',
          },
          {
            usuario_id: 3,
            nombre: 'Luis',
            usuario: 'luis',
            total: '1',
            primera: '2026-11-15 09:00:00',
            ultima: '2026-11-15 09:00:00',
          },
        ],
        undefined,
      ];
    }
    if (sql.includes('COUNT(*) AS total FROM entregas')) return [[{ total: '5' }], undefined];
    if (sql.includes('ORDER BY e.entregado_at DESC')) {
      return [
        [
          {
            id: 9,
            identificador: '0801199012345',
            usuario_id: 2,
            usuario_nombre: 'Ana',
            entregado_at: '2026-11-15 10:00:00',
            num: 7,
            grupo: 3,
          },
        ],
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
    expect(res.body.data.total).toBe(5);
    expect(res.body.data.items[0]).toMatchObject({ identificador: '0801199012345', usuario_nombre: 'Ana' });

    const listCall = query.mock.calls.find(([sql]) => sql.includes('ORDER BY e.entregado_at DESC'));
    expect(listCall[1]).toEqual([2, '2026-11-01 00:00:00', '2026-11-30 23:59:59', '0801%', 20, 0]);
  });

  it('rechaza fechas y DNI inválidos', async () => {
    mockDb(SUPER);
    expect(
      (await request(app).get('/api/entregas?desde=ayer').set('Authorization', bearer(SUPER))).status
    ).toBe(400);
    expect((await request(app).get('/api/entregas?q=abc').set('Authorization', bearer(SUPER))).status).toBe(
      400
    );
  });

  describe('DELETE /api/entregas (vaciar)', () => {
    const vaciar = (user, body) =>
      request(app).delete('/api/entregas').set('Authorization', bearer(user)).send(body);
    const ran = (fragment) => query.mock.calls.some(([sql]) => sql.includes(fragment));

    it('un usuario NORMAL no puede (403) y no se toca la tabla', async () => {
      mockDb(NORMAL);
      expect((await vaciar(NORMAL, { confirmacion: 'VACIAR' })).status).toBe(403);
      expect(ran('TRUNCATE')).toBe(false);
    });

    it('sin la palabra de confirmación: 400 y no borra nada', async () => {
      mockDb(SUPER);
      expect((await vaciar(SUPER, {})).status).toBe(400);
      expect((await vaciar(SUPER, { confirmacion: 'vaciar' })).status).toBe(400);
      expect(ran('TRUNCATE')).toBe(false);
    });

    it('Super Admin con confirmación: vacía, informa cuántas había y audita', async () => {
      mockDb(SUPER);
      const res = await vaciar(SUPER, { confirmacion: 'VACIAR' });
      expect(res.status).toBe(200);
      expect(res.body.data.eliminadas).toBe(5);
      expect(ran('TRUNCATE TABLE entregas')).toBe(true);
      const log = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO auditoria'));
      expect(log[1][1]).toBe('VACIAR_ENTREGAS');
    });

    it('sin permiso DROP usa DELETE como respaldo', async () => {
      query.mockImplementation(async (sql) => {
        if (sql.includes('WHERE u.id = ? AND u.activo = 1')) return [[SUPER], undefined];
        if (sql.includes('COUNT(*) AS total FROM entregas')) return [[{ total: '5' }], undefined];
        if (sql.includes('TRUNCATE'))
          throw Object.assign(new Error('denied'), { code: 'ER_TABLEACCESS_DENIED_ERROR' });
        return [[], undefined];
      });
      expect((await vaciar(SUPER, { confirmacion: 'VACIAR' })).status).toBe(200);
      expect(ran('DELETE FROM entregas')).toBe(true);
    });
  });
});
