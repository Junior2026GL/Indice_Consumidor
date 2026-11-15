// Debe coincidir con passwordSchema del backend (shared/validation/common.js).
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX_BYTES = 72;
export const PASSWORD_HINT = 'Mínimo 10 caracteres, con mayúscula, minúscula y número.';

// Atributo `pattern` del input (los lookaheads exigen cada tipo de carácter).
export const PASSWORD_PATTERN = '(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{10,}';

export function isValidPassword(value) {
  return (
    typeof value === 'string' &&
    value.length >= PASSWORD_MIN &&
    new TextEncoder().encode(value).length <= PASSWORD_MAX_BYTES &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value)
  );
}

/** Puntaje 0-4 para el medidor visual. Es orientativo; la política real la aplica el servidor. */
export function passwordStrength(value) {
  if (!value) return 0;
  let score = 0;
  if (value.length >= PASSWORD_MIN) score += 1;
  if (value.length >= 14) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return Math.min(score, 4);
}
