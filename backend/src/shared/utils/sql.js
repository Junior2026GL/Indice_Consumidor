/** Escapa los comodines de LIKE para que una búsqueda literal como "100%" no coincida con todo. */
export function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, (char) => `\\${char}`);
}
