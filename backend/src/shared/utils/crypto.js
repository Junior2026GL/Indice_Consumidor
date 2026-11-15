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
