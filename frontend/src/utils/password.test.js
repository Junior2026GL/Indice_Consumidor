import { describe, expect, it } from 'vitest';
import { isValidPassword, passwordStrength } from './password.js';
import { initials } from './format.js';

describe('isValidPassword', () => {
  it('acepta contraseñas que cumplen la política', () => {
    expect(isValidPassword('Admin2026ok')).toBe(true);
  });

  it.each(['corta1A', 'sinmayuscula123', 'SINMINUSCULA123', 'SinNumerosAqui', `Aa1${'x'.repeat(80)}`])(
    'rechaza "%s"',
    (value) => {
      expect(isValidPassword(value)).toBe(false);
    }
  );
});

describe('passwordStrength', () => {
  it('crece con la complejidad y tiene tope 4', () => {
    expect(passwordStrength('')).toBe(0);
    expect(passwordStrength('abc')).toBe(0);
    expect(passwordStrength('Admin2026ok')).toBeGreaterThan(passwordStrength('abc'));
    expect(passwordStrength('Admin2026ok!extra-larga')).toBe(4);
  });
});

describe('initials', () => {
  it('toma las iniciales de nombre y apellido', () => {
    expect(initials('Ana Martínez')).toBe('AM');
    expect(initials('  ')).toBe('');
    expect(initials('')).toBe('?');
  });
});
