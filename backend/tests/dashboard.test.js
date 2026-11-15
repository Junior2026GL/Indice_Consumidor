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

function mockDb(sessionUser) {
  query.mockImplementation(async (sql) => {
    if (sql.includes('WHERE u.id = ? AND u.activo = 1')) return [[sessionUser], undefined];
    if (sql.includes('COUNT(DISTINCT identificador)')) {
      return [[{ total: '10', unicos: '9', con_cuenta: '7' }], undefined];
    }
    if (sql.includes('FROM entregas')) return [[{ entregados: '4' }], undefined];
    if (sql.includes('GROUP BY grupo')) {
      return [
        [
          { grupo: 5, total: '6' },
          { grupo: null, total: '4' },
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

describe('GET /api/dashboard/beneficiarios', () => {
  it('exige sesión', async () => {
    mockDb(SUPER);
    expect((await request(app).get('/api/dashboard/beneficiarios')).status).toBe(401);
  });

  it('solo SUPER_ADMIN (otro rol recibe 403)', async () => {
    mockDb(NORMAL);
    const res = await request(app)
      .get('/api/dashboard/beneficiarios')
      .set('Authorization', `Bearer ${signAccessToken(NORMAL)}`);
    expect(res.status).toBe(403);
  });

  it('devuelve totales numéricos, sin cuenta calculado y grupos', async () => {
    mockDb(SUPER);
    const res = await request(app)
      .get('/api/dashboard/beneficiarios')
      .set('Authorization', `Bearer ${signAccessToken(SUPER)}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      total: 10,
      unicos: 9,
      conCuenta: 7,
      sinCuenta: 3,
      entregados: 4,
      pendientes: 5,
      porGrupo: [
        { grupo: 5, total: 6 },
        { grupo: null, total: 4 },
      ],
    });
  });
});
