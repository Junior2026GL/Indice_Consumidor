import { useEffect, useState } from 'react';
import PageHeader from '../../../components/PageHeader.jsx';
import Pagination from '../../../components/Pagination.jsx';
import { IconClock, IconDelivery, IconSearch, IconUsers } from '../../../components/icons.jsx';
import { getErrorMessage } from '../../../services/api.js';
import { formatDateTime, initials } from '../../../utils/format.js';
import { getResumen, listEntregas } from '../services/entregas.service.js';

const PAGE_SIZE = 20;

const pad = (n) => String(n).padStart(2, '0');
const toDateInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function rangoRapido(dias) {
  const hasta = new Date();
  const desde = new Date();
  desde.setDate(hasta.getDate() - (dias - 1));
  return { desde: toDateInput(desde), hasta: toDateInput(hasta) };
}

const fmt = (n) => Number(n ?? 0).toLocaleString('es');
const nombreDe = (u) => u.nombre || u.usuario_nombre || 'Usuario eliminado';

export default function EntregasPage() {
  const [resumen, setResumen] = useState(null);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recarga, setRecarga] = useState(0);

  const [usuarioId, setUsuarioId] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [verFechas, setVerFechas] = useState(false);
  const [dni, setDni] = useState('');
  const [page, setPage] = useState(1);

  const hoy = rangoRapido(1);
  const semana = rangoRapido(7);
  const esTodo = !desde && !hasta;
  const esHoy = desde === hoy.desde && hasta === hoy.hasta;
  const esSemana = desde === semana.desde && hasta === semana.hasta;
  const personalizado = !esTodo && !esHoy && !esSemana;
  const hayFiltros = usuarioId || desde || hasta || dni;

  function aplicarRango(rango) {
    setDesde(rango?.desde || '');
    setHasta(rango?.hasta || '');
  }

  function limpiar() {
    setUsuarioId('');
    setDesde('');
    setHasta('');
    setDni('');
  }

  // Resumen por usuario: respeta el rango de fechas (no el filtro de usuario, para poder elegir otro).
  useEffect(() => {
    getResumen({ desde: desde || undefined, hasta: hasta || undefined })
      .then(setResumen)
      .catch((err) => setError(getErrorMessage(err, 'No se pudo cargar el resumen')));
  }, [desde, hasta, recarga]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      listEntregas({
        usuarioId: usuarioId || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
        q: dni || undefined,
        page,
        pageSize: PAGE_SIZE,
      })
        .then(setData)
        .catch((err) => setError(getErrorMessage(err, 'No se pudo cargar las entregas')))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [usuarioId, desde, hasta, dni, page, recarga]);

  useEffect(() => {
    setPage(1);
  }, [usuarioId, desde, hasta, dni]);

  const usuarios = resumen?.usuarios ?? [];
  const maxTotal = Math.max(1, ...usuarios.map((u) => u.total));

  return (
    <div className="ent">
      <PageHeader
        title="Entregas"
        description="Entregas registradas por cada usuario, con fecha y hora."
        actions={
          <button
            type="button"
            className="btn-outline"
            onClick={() => setRecarga((n) => n + 1)}
            disabled={loading}
          >
            {loading ? 'Actualizando…' : 'Actualizar'}
          </button>
        }
      />

      {error && (
        <div className="alert error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Resumen: cantidad por usuario (toca una tarjeta para filtrar) */}
      <section className="ent-summary">
        <div className="ent-total">
          <span className="ent-total-icon">
            <IconDelivery width={22} height={22} />
          </span>
          <div>
            <small>Entregas {esTodo ? 'en total' : 'en el período'}</small>
            <strong>{resumen ? fmt(resumen.total) : '—'}</strong>
          </div>
        </div>

        <div className="ent-users">
          {resumen && usuarios.length === 0 && <p className="ent-muted">Aún no hay entregas registradas.</p>}
          {usuarios.map((u) => {
            const activo = String(u.usuario_id) === String(usuarioId);
            return (
              <button
                type="button"
                key={u.usuario_id ?? 'sin-usuario'}
                className={`ent-user ${activo ? 'active' : ''}`}
                disabled={u.usuario_id == null}
                onClick={() => setUsuarioId(activo ? '' : String(u.usuario_id))}
                title={u.usuario_id == null ? undefined : 'Filtrar por este usuario'}
              >
                <span className="ent-avatar">{initials(nombreDe(u))}</span>
                <span className="ent-user-info">
                  <strong>{nombreDe(u)}</strong>
                  <small>Última: {formatDateTime(u.ultima)}</small>
                  <span className="ent-bar" aria-hidden="true">
                    <span style={{ width: `${(u.total / maxTotal) * 100}%` }} />
                  </span>
                </span>
                <span className="ent-count">{fmt(u.total)}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Filtros */}
      <div className="audit-bar ent-filters">
        <div className="input-icon audit-filter-search">
          <IconSearch />
          <input
            inputMode="numeric"
            placeholder="Buscar por DNI…"
            value={dni}
            maxLength={13}
            onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
          />
        </div>

        <div className="audit-pills">
          <button type="button" className={`audit-pill ${esTodo ? 'active' : ''}`} onClick={() => aplicarRango(null)}>
            Todo
          </button>
          <button type="button" className={`audit-pill ${esHoy ? 'active' : ''}`} onClick={() => aplicarRango(hoy)}>
            Hoy
          </button>
          <button
            type="button"
            className={`audit-pill ${esSemana ? 'active' : ''}`}
            onClick={() => aplicarRango(semana)}
          >
            7 días
          </button>
          <button
            type="button"
            className={`audit-pill ${verFechas || personalizado ? 'active' : ''}`}
            onClick={() => setVerFechas((v) => !v)}
          >
            Fechas…
          </button>
        </div>

        <select value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)} aria-label="Usuario">
          <option value="">Todos los usuarios</option>
          {usuarios
            .filter((u) => u.usuario_id != null)
            .map((u) => (
              <option key={u.usuario_id} value={u.usuario_id}>
                {nombreDe(u)}
              </option>
            ))}
        </select>

        {(verFechas || personalizado) && (
          <div className="audit-dates">
            <label>
              <span>Desde</span>
              <input type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} />
            </label>
            <label>
              <span>Hasta</span>
              <input type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} />
            </label>
          </div>
        )}
      </div>

      <div className="audit-result-line">
        <span>
          {fmt(data.total)} entrega{data.total === 1 ? '' : 's'}
          {hayFiltros && ' con los filtros actuales'}
        </span>
        {hayFiltros && (
          <button type="button" className="btn-link" onClick={limpiar}>
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Detalle */}
      {loading && data.items.length === 0 ? (
        <div className="table-loading">
          {[0, 1, 2, 3].map((i) => (
            <div className="table-loading-row" key={i} />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <div className="panel">
          <div className="empty-state">
            <span className="empty-state-icon">📦</span>
            <div className="empty-state-title">
              {hayFiltros ? 'Sin entregas para estos filtros' : 'Todavía no hay entregas registradas'}
            </div>
          </div>
        </div>
      ) : (
        <>
          <ul className={`ent-list ${loading ? 'is-refreshing' : ''}`}>
            {data.items.map((e) => (
              <li className="ent-row" key={e.id}>
                <span className="ent-row-icon">
                  <IconDelivery width={18} height={18} />
                </span>
                <div className="ent-row-main">
                  <strong className="ent-dni">{e.identificador}</strong>
                  <small>
                    {e.num != null ? `N.º ${e.num}` : 'N.º —'} · {e.grupo != null ? `Grupo ${e.grupo}` : 'Sin grupo'}
                  </small>
                </div>
                <div className="ent-row-meta">
                  <span className="ent-row-user">
                    <IconUsers width={14} height={14} /> {nombreDe(e)}
                  </span>
                  <time>
                    <IconClock width={14} height={14} /> {formatDateTime(e.entregado_at)}
                  </time>
                </div>
              </li>
            ))}
          </ul>

          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
