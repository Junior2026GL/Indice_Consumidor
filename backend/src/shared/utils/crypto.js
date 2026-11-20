import crypto from 'node:crypto';

export function generateToken(bytes = 48) {
  return crypto.randomBytes(bytes).toString('base64url');
}

/** Los refresh tokens se guardan solo como hash: un volcado de la BD no sirve para iniciar sesión. */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function newFamilyId() {
  return crypto.randomUUID();
}

/** Cifrado autenticado (AES-256-GCM) para datos que deben poder leerse de nuevo, como el secreto TOTP. */
const keyFrom = (secret) => crypto.createHash('sha256').update(String(secret)).digest();

export function encryptSecret(plain, secret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyFrom(secret), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((part) => part.toString('base64url')).join('.');
}

export function decryptSecret(payload, secret) {
  const [iv, tag, data] = String(payload)
    .split('.')
    .map((part) => Buffer.from(part, 'base64url'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyFrom(secret), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

/** Códigos de respaldo legibles (XXXXX-XXXXX) sin caracteres ambiguos. */
const BACKUP_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function generateBackupCodes(count = 8) {
  return Array.from({ length: count }, () => {
    const chars = Array.from(crypto.randomBytes(10), (b) => BACKUP_ALPHABET[b % BACKUP_ALPHABET.length]).join(
      ''
    );
    return `${chars.slice(0, 5)}-${chars.slice(5)}`;
  });
}

/** Normaliza lo que escribe el usuario (sin guiones ni espacios, mayúsculas) antes de comparar el hash. */
export const normalizeBackupCode = (code) => String(code).replace(/[\s-]/g, '').toUpperCase();
export const hashBackupCode = (code) => hashToken(normalizeBackupCode(code));
