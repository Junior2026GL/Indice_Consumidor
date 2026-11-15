export default function PageLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{ padding: 48, textAlign: 'center', color: 'var(--color-muted)' }}
    >
      Cargando…
    </div>
  );
}
