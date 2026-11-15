import { describe, expect, it } from 'vitest';
import { hashToken, generateToken } from '../src/shared/utils/crypto.js';
import { getClientIp, normalizeIp } from '../src/shared/utils/clientIp.js';
import { escapeLike } from '../src/shared/utils/sql.js';
import { idParams, passwordSchema, booleanLike } from '../src/shared/validation/common.js';
import { createUserSchema } from '../src/modules/users/users.schemas.js';

describe('passwordSchema', () => {
  it('acepta una contraseña que cumple la política', () => {
    expect(passwordSchema.safeParse('Admin2026ok').success).toBe(true);
  });

  it.each([
    ['corta', 'Ab1'],
    ['sin mayúscula', 'sinmayuscula1'],
    ['sin minúscula', 'SINMINUSCULA1'],
    ['sin número', 'SinNumeroAqui'],
    ['más de 72 bytes', `Aa1${'x'.repeat(80)}`],
  ])('rechaza contraseña %s', (_, value) => {
    expect(passwordSchema.safeParse(value).success).toBe(false);
  });
});

describe('idParams', () => {
  it('convierte a número', () => {
    expect(idParams.parse({ id: '12' }).id).toBe(12);
  });

  it.each(['abc', '0', '-3', '1.5', ''])('rechaza "%s"', (id) => {
    expect(idParams.safeParse({ id }).success).toBe(false);
  });
});

describe('booleanLike', () => {
  it('interpreta cadenas de query', () => {
    expect(booleanLike.parse('true')).toBe(true);
    expect(booleanLike.parse('1')).toBe(true);
    expect(booleanLike.parse('false')).toBe(false);
  });
});

describe('createUserSchema', () => {
  const valid = {
    nombre: 'Ana Martínez',
    usuario: 'ana.m',
    email: 'ANA@Example.com',
    telefono: '9999-9999',
    password: 'Admin2026ok',
    rol: 'NORMAL',
  };

  it('normaliza correo y teléfono', () => {
    const data = createUserSchema.parse(valid);
    expect(data.email).toBe('ana@example.com');
    expect(data.telefono).toBe('99999999');
  });

  it('convierte vacíos opcionales en null', () => {
    const data = createUserSchema.parse({ ...valid, email: '', telefono: '' });
    expect(data.email).toBeNull();
    expect(data.telefono).toBeNull();
  });

  it('descarta campos desconocidos (mass assignment)', () => {
    const data = createUserSchema.parse({ ...valid, activo: 0, id: 1, rol_id: 1 });
    expect(data).not.toHaveProperty('activo');
    expect(data).not.toHaveProperty('id');
    expect(data).not.toHaveProperty('rol_id');
  });

  it('rechaza roles inexistentes y usuarios inválidos', () => {
    expect(createUserSchema.safeParse({ ...valid, rol: 'ROOT' }).success).toBe(false);
    expect(createUserSchema.safeParse({ ...valid, usuario: 'a b' }).success).toBe(false);
  });
});

describe('utilidades', () => {
  it('escapeLike neutraliza comodines', () => {
    expect(escapeLike('100%_a\\b')).toBe('100\\%\\_a\\\\b');
  });

  it('hashToken es determinista y no revela el token', () => {
    const token = generateToken();
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toContain(token);
    expect(hashToken(token)).toHaveLength(64);
  });

  it('getClientIp ignora cabeceras falsificables y usa req.ip', () => {
    const req = { ip: '::ffff:203.0.113.9', headers: { 'x-forwarded-for': '1.2.3.4' }, socket: {} };
    expect(getClientIp(req)).toBe('203.0.113.9');
    expect(normalizeIp('no-es-ip')).toBeNull();
  });
});
