import { Link, useRouteError } from 'react-router-dom';

export default function RouteError() {
  const error = useRouteError();
  console.error(error);

  return (
    <div style={{ padding: 48, textAlign: 'center' }}>
      <h2>No pudimos mostrar esta página</h2>
      <p>Ocurrió un error inesperado. Intenta de nuevo o vuelve al inicio.</p>
      <Link className="btn-primary" to="/">
        Volver al inicio
      </Link>
    </div>
  );
}
