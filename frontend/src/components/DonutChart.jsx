import { useState } from 'react';

const SIZE = 200;
const CENTER = SIZE / 2;
const RADIUS = 78;
const STROKE = 26;
const GAP = 2; // separación entre porciones (color de la superficie), en unidades del viewBox
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const fmt = (n) => Number(n).toLocaleString('es');
const pct = (value, total) =>
  total ? `${((value / total) * 100).toLocaleString('es', { maximumFractionDigits: 1 })}%` : '0%';

/**
 * Gráfica de pastel en forma de dona. Cada porción se identifica en la leyenda con su
 * nombre, cantidad y porcentaje (nunca solo por color); al pasar el cursor, enfocar con
 * teclado o tocar, la porción se resalta y el centro muestra su detalle.
 *
 * slices: [{ key, label, value, color }]  (los valores en 0 se omiten)
 */
export default function DonutChart({ slices, totalLabel = 'Total', ariaLabel }) {
  const [active, setActive] = useState(null);

  const data = slices.filter((s) => s.value > 0);
  const total = data.reduce((sum, s) => sum + s.value, 0);
  const current = active != null ? data.find((s) => s.key === active) : null;

  let cumulative = 0;
  const arcs = data.map((slice) => {
    const length = (slice.value / total) * CIRCUMFERENCE;
    const drawn = data.length > 1 ? Math.max(length - GAP, 0.5) : length;
    const arc = { ...slice, drawn, offset: -cumulative };
    cumulative += length;
    return arc;
  });

  if (total === 0) {
    return <p className="donut-empty">Sin datos para mostrar.</p>;
  }

  return (
    <div className="donut">
      <div className="donut-figure">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={
            ariaLabel || `Gráfica de pastel. ${data.map((s) => `${s.label}: ${fmt(s.value)}`).join('; ')}`
          }
        >
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="var(--donut-track)"
            strokeWidth={STROKE}
          />
          <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
            {arcs.map((arc) => (
              <circle
                key={arc.key}
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke={arc.color}
                strokeWidth={active === arc.key ? STROKE + 5 : STROKE}
                strokeDasharray={`${arc.drawn} ${CIRCUMFERENCE - arc.drawn}`}
                strokeDashoffset={arc.offset}
                opacity={active != null && active !== arc.key ? 0.3 : 1}
                className="donut-arc"
                onPointerEnter={() => setActive(arc.key)}
                onPointerLeave={() => setActive(null)}
                onClick={() => setActive((prev) => (prev === arc.key ? null : arc.key))}
              />
            ))}
          </g>
        </svg>

        <div className="donut-center" aria-live="polite">
          <strong>{fmt(current ? current.value : total)}</strong>
          <span>{current ? `${current.label} · ${pct(current.value, total)}` : totalLabel}</span>
        </div>
      </div>

      <ul className="donut-legend">
        {data.map((s) => (
          <li key={s.key}>
            <button
              type="button"
              className={active === s.key ? 'is-active' : ''}
              onPointerEnter={() => setActive(s.key)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(s.key)}
              onBlur={() => setActive(null)}
            >
              <i style={{ background: s.color }} aria-hidden="true" />
              <span className="donut-legend-name">{s.label}</span>
              <span className="donut-legend-value">{fmt(s.value)}</span>
              <span className="donut-legend-pct">{pct(s.value, total)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
