import { useEffect, useRef, useState } from 'react';
import { IconAlert, IconCheck, IconSearch } from '../../../components/icons.jsx';
import { getErrorMessage } from '../../../services/api.js';
import { copyText } from '../../../utils/clipboard.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { formatDateTime, initials } from '../../../utils/format.js';
import {
  anularEntrega,
  buscarIndemnizacion,
  buscarPorDni,
  marcarEntrega,
} from '../services/beneficiarios.service.js';

const DNI_LENGTH = 13;
const NAME_MIN = 3;

const MODES = [
  {
    id: 'beneficiario',
    title: 'Número de Línea IPC',
    desc: 'Consulta por DNI: número, grupo y cuenta Occidente, con registro de entrega.',
    tone: 'blue',
  },
  {
    id: 'indemnizacion',
    title: 'Indemnización',
    desc: 'Consulta por DNI del monto de indemnización del beneficiario.',
    tone: 'green',
  },
];

function ModeIcon({ id }) {
  const common = {
    viewBox: '0 0 24 24',
    width: 28,
    height: 28,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };
  if (id === 'indemnizacion') {
    // Billetes
    return (
      <svg {...common}>
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M6 10v.01M18 14v.01" />
      </svg>
    );
  }
  // Tarjeta de identificación
  return (
    <svg {...common}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="11" r="2.2" />
      <path d="M5.5 17c.6-1.7 2-2.5 3.5-2.5s2.9.8 3.5 2.5M15 9h3M15 13h3" />
    </svg>
  );
}

/** Monto en lempiras con 2 decimales (la BD guarda 8, que no aportan al leerlo). */
function formatMonto(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `L ${n.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function IndemnizacionCard({ item }) {
  return (
    <article className="resultado">
      <div className="resultado-ok">
        <span className="resultado-ok-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
        Indemnización encontrada
      </div>

      <div className="resultado-tiles">
        <div>
          <span>N.º</span>
          <strong>{item.numero ?? '—'}</strong>
        </div>
        <div>
          <span>DNI</span>
          <strong>{item.identificador || '—'}</strong>
        </div>
      </div>

      <div className="resultado-dni">
        <span>Nombre</span>
        <strong>{item.nombre || '—'}</strong>
      </div>

      <div className="resultado-cuenta">
        <span>Indemnización</span>
        <strong>{formatMonto(item.indemnizacion)}</strong>
      </div>
    </article>
  );
}

function IconCopy(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

function IconRefresh(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20 11a8 8 0 0 0-14.9-3.5M4 4v4h4" />
      <path d="M4 13a8 8 0 0 0 14.9 3.5M20 20v-4h-4" />
    </svg>
  );
}

/** Estado de entrega: botón "Marcar como entregado" (con confirmación) o la constancia de cuándo se entregó. */
function EntregaBlock({ dni, entrega, canUndo, onChanged }) {
  const [step, setStep] = useState('idle'); // idle | confirm | saving
  const [undoOpen, setUndoOpen] = useState(false);
  const [error, setError] = useState('');

  async function run(action, fallback) {
    setStep('saving');
    setError('');
    try {
      await action();
    } catch (err) {
      setError(getErrorMessage(err, fallback));
    }
    // Siempre se vuelve a consultar: así se ve el estado real (p. ej. si otra persona ya lo marcó).
    await onChanged();
    setStep('idle');
    setUndoOpen(false);
  }

  if (entrega) {
    return (
      <div className="entrega-wrap">
        <div className="entrega entrega-hecha">
          <span className="entrega-icon" aria-hidden="true">
            {/* Planilla con check: constancia de entrega registrada */}
            <svg
              viewBox="0 0 24 24"
              width="30"
              height="30"
              fill="none"
              stroke="#fff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="8" y="2" width="8" height="4" rx="1" />
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <path d="m9 14 2 2 4-4" />
            </svg>
          </span>
          <div className="entrega-info">
            <strong>Entregado</strong>
            <time>{formatDateTime(entrega.entregado_at)}</time>
            {entrega.entregado_por && <small>Registrado por {entrega.entregado_por}</small>}
          </div>
        </div>
        {error && <p className="entrega-error">{error}</p>}

        {canUndo && !undoOpen && (
          <button type="button" className="entrega-anular" onClick={() => setUndoOpen(true)}>
            <svg
              viewBox="0 0 24 24"
              width="17"
              height="17"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Anular entrega
          </button>
        )}

        {canUndo && undoOpen && (
          <div className="entrega entrega-anulando">
            <p>
              ¿Anular esta entrega? El beneficiario volverá a quedar como <b>pendiente</b>.
            </p>
            <div className="entrega-acciones">
              <button
                type="button"
                className="entrega-btn entrega-btn-danger"
                disabled={step === 'saving'}
                onClick={() => run(() => anularEntrega(dni), 'No se pudo anular la entrega')}
              >
                {step === 'saving' ? 'Anulando…' : 'Sí, anular'}
              </button>
              <button
                type="button"
                className="entrega-cancelar"
                disabled={step === 'saving'}
                onClick={() => setUndoOpen(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (step === 'idle') {
    return (
      <div className="entrega-wrap">
        {error && <p className="entrega-error">{error}</p>}
        <button type="button" className="entrega-btn" onClick={() => setStep('confirm')}>
          <IconCheck width={20} height={20} />
          Marcar como entregado
        </button>
      </div>
    );
  }

  return (
    <div className="entrega-wrap">
      <div className="entrega entrega-confirmar">
        <p>¿Confirmas que se entregó a este beneficiario? Quedará registrada la fecha y hora.</p>
        <div className="entrega-acciones">
          <button
            type="button"
            className="entrega-btn"
            disabled={step === 'saving'}
            onClick={() => run(() => marcarEntrega(dni), 'No se pudo registrar la entrega')}
          >
            {step === 'saving' ? 'Guardando…' : 'Sí, entregado'}
          </button>
          <button
            type="button"
            className="entrega-cancelar"
            disabled={step === 'saving'}
            onClick={() => setStep('idle')}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ item, onChanged }) {
  const [copied, setCopied] = useState(false);
  const cuenta = String(item.cuenta_occidente ?? '').trim();

  async function copy() {
    if (await copyText(cuenta)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <article className="resultado">
      <div className="resultado-ok">
        <span className="resultado-ok-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
        Beneficiario encontrado
      </div>

      <div className="resultado-tiles">
        <div>
          <span>N.º</span>
          <strong>{item.num ?? '—'}</strong>
        </div>
        <div>
          <span>Grupo</span>
          <strong>{item.grupo ?? '—'}</strong>
        </div>
      </div>

      <div className="resultado-dni">
        <span>DNI</span>
        <strong>{item.identificador || '—'}</strong>
      </div>

      <div className={`resultado-cuenta ${cuenta ? '' : 'vacia'}`}>
        <span>Cuenta Occidente</span>
        {cuenta && (
          <div className="resultado-cuenta-row">
            <strong>{cuenta}</strong>
            <button
              type="button"
              className="resultado-copy"
              onClick={copy}
              aria-label="Copiar número de cuenta"
            >
              {copied ? <IconCheck width={16} height={16} /> : <IconCopy width={16} height={16} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        )}
      </div>

      <EntregaBlock
        dni={item.identificador}
        entrega={item.entrega}
        canUndo={Boolean(item.entrega?.puede_anular)}
        onChanged={onChanged}
      />
    </article>
  );
}

/** Ventana con el resultado. Tocar fuera NO la cierra: solo la X, Esc o "Nueva consulta". */
function ResultModal({ children, onClose, isIndem }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // el fondo no se desplaza detrás del modal
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="rmodal-overlay">
      <div className="rmodal" role="dialog" aria-modal="true" aria-label="Resultado de la consulta">
        <header className="rmodal-head">
          <div>
            <strong>Resultado de la consulta</strong>
            <span>{isIndem ? 'Indemnización del beneficiario' : 'Información del beneficiario'}</span>
          </div>
          <button type="button" className="rmodal-close" onClick={onClose} aria-label="Cerrar">
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div className="rmodal-body">{children}</div>

        <footer className="rmodal-foot">
          <button type="button" className="consulta-new" onClick={onClose}>
            <IconRefresh width={18} height={18} />
            Nueva consulta
          </button>
        </footer>
      </div>
    </div>
  );
}

export default function ConsultaPage() {
  const { user, logout } = useAuth();
  const inputRef = useRef(null);
  const [mode, setMode] = useState(null); // null = menú de opciones;
  const [by, setBy] = useState('dni'); // solo en Indemnización: 'dni' | 'nombre'
  const [dni, setDni] = useState('');
  const [result, setResult] = useState(null); // null = aún no se busca
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isIndem = mode === 'indemnizacion';
  const byName = isIndem && by === 'nombre';
  const ready = byName ? dni.trim().length >= NAME_MIN : dni.length === DNI_LENGTH;
  const current = MODES.find((m) => m.id === mode);
  const consultar = (valor) =>
    isIndem ? buscarIndemnizacion(byName ? { nombre: valor.trim() } : { dni: valor }) : buscarPorDni(valor);

  function changeMode(next) {
    setMode(next);
    setBy('dni');
    setDni('');
    setResult(null);
    setError('');
  }

  function changeBy(next) {
    setBy(next);
    setDni('');
    setResult(null);
    setError('');
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleChange(e) {
    if (byName) {
      setDni(e.target.value.slice(0, 100));
      setResult(null);
      setError('');
      return;
    }
    // Solo dígitos (también al pegar texto con guiones o espacios), máximo 13.
    setDni(e.target.value.replace(/\D/g, '').slice(0, DNI_LENGTH));
    setResult(null);
    setError('');
  }

  async function submit(e) {
    e.preventDefault();
    if (!ready || loading) return;

    setLoading(true);
    setError('');
    setResult(null);
    inputRef.current?.blur(); // cierra el teclado en el celular para ver el resultado

    try {
      setResult(await consultar(dni));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo realizar la consulta'));
    } finally {
      setLoading(false);
    }
  }

  // Vuelve a consultar el mismo DNI para mostrar el estado de entrega actualizado.
  async function refresh() {
    try {
      setResult(await consultar(dni));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo actualizar la consulta'));
    }
  }

  function clear() {
    setDni('');
    setResult(null);
    setError('');
    inputRef.current?.focus();
  }

  return (
    <div className="consulta-shell">
      <header className="consulta-header">
        <span className="consulta-logo" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="26"
            height="26"
            fill="none"
            stroke="#fff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="6.5" />
            <path d="m20 20-4.2-4.2" />
          </svg>
        </span>
        <div className="consulta-header-text">
          <div className="brand light">
            IPC <span>INSEP</span>
          </div>
          <p>{current ? current.title : 'Consultas'}</p>
        </div>

        {user && (
          <div className="consulta-user">
            <span className="consulta-user-avatar" aria-hidden="true">
              {initials(user.nombre)}
            </span>
            <span className="consulta-user-name" title={user.nombre}>
              {user.nombre}
            </span>
            <button type="button" className="consulta-user-exit" onClick={logout}>
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="m16 17 5-5-5-5M21 12H9" />
              </svg>
              Salir
            </button>
          </div>
        )}
      </header>

      <main className="consulta">
        {!mode && (
          <>
            <div className="consulta-menu-head">
              <strong>Consultas</strong>
              <span>Seleccione el tipo de consulta con la que desea trabajar</span>
            </div>
            <nav className="consulta-menu" aria-label="Tipo de consulta">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="consulta-menu-item"
                  onClick={() => changeMode(m.id)}
                >
                  <span className={`consulta-menu-icon ${m.tone}`}>
                    <ModeIcon id={m.id} />
                  </span>
                  <span className="consulta-menu-text">
                    <strong>{m.title}</strong>
                    <small>{m.desc}</small>
                  </span>
                  <svg
                    className="consulta-menu-arrow"
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </button>
              ))}
            </nav>
          </>
        )}

        {mode && (
          <button type="button" className="consulta-back" onClick={() => changeMode(null)}>
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m15 6-6 6 6 6" />
            </svg>
            Volver al menú
          </button>
        )}

        {mode && (
          <form className="consulta-card" onSubmit={submit}>
            {isIndem && (
              <div className="consulta-by" role="tablist" aria-label="Buscar por">
                {[
                  ['dni', 'Por DNI'],
                  ['nombre', 'Por nombre'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={by === id}
                    className={by === id ? 'active' : ''}
                    onClick={() => changeBy(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <label htmlFor="dni">{byName ? 'Nombre del beneficiario' : 'Número de DNI'}</label>
            <input
              key={by}
              id="dni"
              ref={inputRef}
              className={`consulta-input ${byName ? 'consulta-input-name' : ''}`}
              type="text"
              inputMode={byName ? 'text' : 'numeric'}
              pattern={byName ? undefined : String.raw`\d{13}`}
              maxLength={byName ? 100 : DNI_LENGTH}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
              placeholder={byName ? 'Ej. Juan López' : '0000000000000'}
              value={dni}
              onChange={handleChange}
              aria-describedby="dni-ayuda"
            />
            {byName ? (
              <div className="consulta-meta" id="dni-ayuda">
                <span>Escribe al menos {NAME_MIN} letras (nombre, apellido o ambos)</span>
              </div>
            ) : (
              <>
                <div className="consulta-progress" aria-hidden="true">
                  <span
                    style={{ width: `${(dni.length / DNI_LENGTH) * 100}%` }}
                    className={ready ? 'full' : ''}
                  />
                </div>
                <div className="consulta-meta" id="dni-ayuda">
                  <span>Ingresa los 13 dígitos, sin guiones</span>
                  <span className={ready ? 'ok' : ''}>
                    {dni.length}/{DNI_LENGTH}
                  </span>
                </div>
              </>
            )}

            <button className="btn-primary consulta-submit" type="submit" disabled={!ready || loading}>
              {loading ? (
                <span className="consulta-spinner" aria-hidden="true" />
              ) : (
                <IconSearch width={20} height={20} />
              )}
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </form>
        )}

        <div aria-live="polite">
          {error && (
            <div className="alert error consulta-alert">
              <IconAlert width={17} height={17} />
              <span>{error}</span>
            </div>
          )}
        </div>

        <footer className="consulta-footer">© {new Date().getFullYear()} IPC INSEP</footer>
      </main>

      {result && (
        <ResultModal onClose={clear} isIndem={isIndem}>
          {!result.encontrado ? (
            <div className="consulta-empty modal-empty">
              <span className="consulta-empty-icon">
                <IconSearch width={26} height={26} />
              </span>
              <strong>Sin resultados</strong>
              <p>
                {isIndem
                  ? byName
                    ? `No se encontró indemnización para "${dni.trim()}".`
                    : `No se encontró indemnización para el DNI ${dni}.`
                  : `No se encontró ningún beneficiario con el DNI ${dni}.`}
              </p>
            </div>
          ) : isIndem ? (
            <>
              {result.truncado && (
                <p className="consulta-truncado">
                  Hay más coincidencias: se muestran las primeras {result.items.length}. Escribe más del
                  nombre para acotar.
                </p>
              )}
              {result.items.map((item) => (
                <IndemnizacionCard key={item.identificador} item={item} />
              ))}
            </>
          ) : (
            result.items.map((item, index) => (
              <ResultCard key={`${item.num}-${index}`} item={item} onChanged={refresh} />
            ))
          )}
        </ResultModal>
      )}
    </div>
  );
}
