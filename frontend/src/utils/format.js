export function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}

/**
 * Formatea una fecha de la BD ("2026-11-15 16:35:00", ya en hora de Honduras) como
 * "15 nov 2026, 4:35 p. m." sin convertir zonas horarias.
 */
export function formatDateTime(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(String(value ?? ''));
  if (!m) return String(value ?? '');
  const [year, month, day, hour, minute] = m.slice(1).map(Number);
  return new Date(year, month - 1, day, hour, minute).toLocaleString('es-HN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
