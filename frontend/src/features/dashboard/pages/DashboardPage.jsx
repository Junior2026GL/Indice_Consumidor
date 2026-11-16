import { useCallback, useEffect, useMemo, useState } from 'react';
import PageHeader from '../../../components/PageHeader.jsx';
import DonutChart from '../../../components/DonutChart.jsx';
import { IconAlert, IconCheck, IconShield, IconUsers } from '../../../components/icons.jsx';
import { getErrorMessage } from '../../../services/api.js';
import { getBeneficiariosResumen } from '../services/dashboard.service.js';
import { getResumen as getEntregasPorUsuario } from '../../entregas/services/entregas.service.js';

const MAX_GROUP_SLICES = 8; // hasta 8 grupos con color propio; si hubiera más, el resto se agrupa en "Otros"
const SERIES = [
  'var(--series-1)',
  'var(--series-2)',
  'var(--series-3)',
  'var(--series-4)',
  'var(--series-5)',
  'var(--series-6)',
  'var(--series-7)',
  'var(--series-8)',
];

const fmt = (n) => Number(n ?? 0).toLocaleString('es');
const groupLabel = (grupo) => (grupo == null ? 'Sin grupo' : `Grupo ${grupo}`);

function buildGroupSlices(porGrupo) {
  const top = porGrupo.slice(0, MAX_GROUP_SLICES);
  const rest = porGrupo.slice(MAX_GROUP_SLICES);

  // El color sigue al grupo (orden por número de grupo), no a su posición en el ranking.
  const colorOf = new Map(
    [...top]
      .sort((a, b) => (a.grupo ?? Infinity) - (b.grupo ?? Infinity))
      .map((g, index) => [g.grupo, SERIES[index]])
  );

  const slices = top.map((g) => ({
    key: `g-${g.grupo ?? 'none'}`,
    label: groupLabel(g.grupo),
    value: g.total,
    color: colorOf.get(g.grupo),
  }));

  if (rest.length) {
    slices.push({
      key: 'otros',
      label: `Otros (${rest.length} grupos)`,
      value: rest.reduce((sum, g) => sum + g.total, 0),
      color: 'var(--series-other)',
    });
  }
  return slices;
}

/** Entregas por usuario: el color sigue al usuario (orden por id), no a su posición en el ranking. */
function buildUserSlices(usuarios) {
  const top = usuarios.slice(0, MAX_GROUP_SLICES);
  const rest = usuarios.slice(MAX_GROUP_SLICES);
  const colorOf = new Map(
    [...top]
      .sort((a, b) => (a.usuario_id ?? Infinity) - (b.usuario_id ?? Infinity))
      .map((u, index) => [u.usuario_id, SERIES[index]])
  );

  const slices = top.map((u) => ({
    key: `u-${u.usuario_id ?? 'none'}`,
    label: u.nombre || 'Usuario eliminado',
    value: u.total,
    color: colorOf.get(u.usuario_id),
  }));

  if (rest.length) {
    slices.push({
      key: 'otros',
      label: `Otros (${rest.length} usuarios)`,
      value: rest.reduce((sum, u) => sum + u.total, 0),
      color: 'var(--series-other)',
    });
  }
  return slices;
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [porUsuario, setPorUsuario] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback((signal, fresh = false) => {
    setLoading(true);
    // Entregas por usuario: si falla, el resto del dashboard se muestra igual.
    getEntregasPorUsuario()
      .then((r) => !signal?.aborted && setPorUsuario(r.usuarios))
      .catch(() => {});

    getBeneficiariosResumen({ signal, fresh })
      .then((result) => {
        setData(result);
        setError('');
      })
      .catch((err) => {
        if (signal?.aborted) return;
        setError(getErrorMessage(err, 'No se pudo cargar el dashboard'));
      })
      .finally(() => {
        if (!signal?.aborted) setLoading(false);
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const groupSlices = useMemo(() => (data ? buildGroupSlices(data.porGrupo) : []), [data]);
  const deliverySlices = useMemo(
    () =>
      data
        ? [
            { key: 'entregados', label: 'Entregados', value: data.entregados, color: 'var(--series-3)' },
            { key: 'pendientes', label: 'Pendientes', value: data.pendientes, color: 'var(--series-2)' },
          ]
        : [],
    [data]
  );
  const userSlices = useMemo(() => buildUserSlices(porUsuario), [porUsuario]);
  const accountSlices = useMemo(
    () =>
      data
        ? [
            { key: 'con', label: 'Con cuenta', value: data.conCuenta, color: 'var(--series-1)' },
            { key: 'sin', label: 'Sin cuenta', value: data.sinCuenta, color: 'var(--series-2)' },
          ]
        : [],
    [data]
  );

  return (
    <div className="dashb">
      <PageHeader
        title="Dashboard"
        description="Resumen de beneficiarios."
        actions={
          <button
            type="button"
            className="btn-outline"
            onClick={() => load(undefined, true)}
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

      {!data && loading && <div className="dashb-loading">Cargando datos…</div>}

      {data && (
        <div className={`dashb-body ${loading ? 'is-refreshing' : ''}`}>
          <div className="card-grid dashb-kpis">
            <div className="stat-card blue">
              <div className="stat-card-icon blue">
                <IconUsers />
              </div>
              <span>Total de beneficiarios</span>
              <strong>{fmt(data.total)}</strong>
            </div>
            <div className="stat-card purple">
              <div className="stat-card-icon purple">
                <IconShield />
              </div>
              <span>DNI distintos</span>
              <strong>{fmt(data.unicos)}</strong>
            </div>
            <div className="stat-card green">
              <div className="stat-card-icon green">
                <IconCheck />
              </div>
              <span>Con cuenta Occidente</span>
              <strong>{fmt(data.conCuenta)}</strong>
            </div>
            <div className="stat-card amber">
              <div className="stat-card-icon amber">
                <IconAlert />
              </div>
              <span>Sin cuenta Occidente</span>
              <strong>{fmt(data.sinCuenta)}</strong>
            </div>
            <div className="stat-card green">
              <div className="stat-card-icon green">
                <IconCheck />
              </div>
              <span>Entregados</span>
              <strong>{fmt(data.entregados)}</strong>
            </div>
            <div className="stat-card amber">
              <div className="stat-card-icon amber">
                <IconAlert />
              </div>
              <span>Pendientes de entrega</span>
              <strong>{fmt(data.pendientes)}</strong>
            </div>
          </div>

          <div className="dashb-charts">
            <section className="panel dashb-card">
              <h3 className="panel-title">Entregas</h3>
              <DonutChart slices={deliverySlices} totalLabel="Beneficiarios" />
            </section>
            <section className="panel dashb-card">
              <h3 className="panel-title">Beneficiarios por grupo</h3>
              <DonutChart slices={groupSlices} totalLabel="Beneficiarios" />
            </section>

            <section className="panel dashb-card">
              <h3 className="panel-title">Entregas por usuario</h3>
              <DonutChart slices={userSlices} totalLabel="Entregas" />
            </section>

            <section className="panel dashb-card">
              <h3 className="panel-title">Cuenta Occidente</h3>
              <DonutChart slices={accountSlices} totalLabel="Beneficiarios" />
            </section>
          </div>

          <p className="dashb-updated">
            Actualizado: {new Date(data.actualizado).toLocaleString('es')} · los datos se refrescan cada
            minuto como máximo.
          </p>
        </div>
      )}
    </div>
  );
}
