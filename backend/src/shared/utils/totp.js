import crypto from 'node:crypto';

/** TOTP (RFC 6238): SHA-1, 6 dígitos, intervalos de 30 s: compatible con Google/Microsoft Authenticator, Authy, etc. */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const STEP_SECONDS = 30;
const DIGITS = 6;

export function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text) {
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const char of text.replace(/=+$/, '').toUpperCase()) {
    const index = ALPHABET.indexOf(char);
    if (index === -1) throw new Error('Base32 inválido');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export const generateSecret = () => base32Encode(crypto.randomBytes(20));

function hotp(secretBase32, counter) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', base32Decode(secretBase32)).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** DIGITS;
  return String(code).padStart(DIGITS, '0');
}

export const stepAt = (nowMs = Date.now()) => Math.floor(nowMs / 1000 / STEP_SECONDS);

/**
 * Comprueba el código admitiendo ±1 intervalo (desfase de reloj del teléfono).
 * Devuelve el intervalo que coincidió (para impedir reutilizarlo) o null.
 */
export function verifyTotp(secretBase32, code, { nowMs = Date.now(), window = 1 } = {}) {
  if (!/^\d{6}$/.test(String(code))) return null;
  const expected = Buffer.from(String(code));
  const current = stepAt(nowMs);
  let matched = null;
  for (let step = current - window; step <= current + window; step++) {
    const candidate = Buffer.from(hotp(secretBase32, step));
    // Se recorren todos los intervalos y se compara en tiempo constante.
    if (crypto.timingSafeEqual(candidate, expected) && matched === null) matched = step;
  }
  return matched;
}

export function otpauthUrl({ secret, account, issuer }) {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: '30',
  });
  return `otpauth://totp/${label}?${params}`;
}

export { hotp as _hotp };
