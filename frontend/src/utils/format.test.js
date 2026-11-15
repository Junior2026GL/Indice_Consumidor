import { describe, expect, it } from 'vitest';
import { formatDateTime } from './format.js';

describe('formatDateTime', () => {
  it('muestra día, mes, año y hora de la BD sin convertir zona horaria', () => {
    const text = formatDateTime('2026-11-15 16:35:00');
    expect(text).toMatch(/15/);
    expect(text).toMatch(/nov/i);
    expect(text).toMatch(/2026/);
    expect(text).toMatch(/4:35/);
  });

  it('devuelve el texto original si no es una fecha reconocible', () => {
    expect(formatDateTime('no es fecha')).toBe('no es fecha');
    expect(formatDateTime(null)).toBe('');
  });
});
