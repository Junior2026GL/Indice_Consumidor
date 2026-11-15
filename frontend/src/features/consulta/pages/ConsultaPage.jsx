import { useRef, useState } from 'react';
import { IconAlert, IconCheck, IconSearch } from '../../../components/icons.jsx';
import { getErrorMessage } from '../../../services/api.js';
import { copyText } from '../../../utils/clipboard.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { formatDateTime } from '../../../utils/format.js';
import { anularEntrega, buscarPorDni, marcarEntrega } from '../services/beneficiarios.service.js';

const DNI_LENGTH = 13;

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

function ResultCard({ item, isSuperAdmin, onChanged }) {
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
        canUndo={isSuperAdmin}
        onChanged={onChanged}
      />
    </article>
  );
}

export default function ConsultaPage() {
  const { user } = useAuth();
  const inputRef = useRef(null);
  const [dni, setDni] = useState('');
  const [result, setResult] = useState(null); // null = aún no se busca
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const ready = dni.length === DNI_LENGTH;

  function handleChange(e) {
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
      setResult(await buscarPorDni(dni));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo realizar la consulta'));
    } finally {
      setLoading(false);
    }
  }

  // Vuelve a consultar el mismo DNI para mostrar el estado de entrega actualizado.
  async function refresh() {
    try {
      setResult(await buscarPorDni(dni));
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
        <div className="brand large light">
          IPC <span>INSEP</span>
        </div>
        <p>Consulta de beneficiarios</p>
      </header>

      <main className="consulta">
        <form className="consulta-card" onSubmit={submit}>
          <label htmlFor="dni">Número de DNI</label>
          <input
            id="dni"
            ref={inputRef}
            className="consulta-input"
            type="text"
            inputMode="numeric"
            pattern="\d{13}"
            maxLength={DNI_LENGTH}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
            placeholder="0000000000000"
            value={dni}
            onChange={handleChange}
            aria-describedby="dni-ayuda"
          />
          <div className="consulta-progress" aria-hidden="true">
            <span style={{ width: `${(dni.length / DNI_LENGTH) * 100}%` }} className={ready ? 'full' : ''} />
          </div>
          <div className="consulta-meta" id="dni-ayuda">
            <span>Ingresa los 13 dígitos, sin guiones</span>
            <span className={ready ? 'ok' : ''}>
              {dni.length}/{DNI_LENGTH}
            </span>
          </div>

          <button className="btn-primary consulta-submit" type="submit" disabled={!ready || loading}>
            {loading ? (
              <span className="consulta-spinner" aria-hidden="true" />
            ) : (
              <IconSearch width={20} height={20} />
            )}
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        <div aria-live="polite">
          {error && (
            <div className="alert error consulta-alert">
              <IconAlert width={17} height={17} />
              <span>{error}</span>
            </div>
          )}

          {result && !result.encontrado && (
            <div className="consulta-empty">
              <span className="consulta-empty-icon">
                <IconSearch width={26} height={26} />
              </span>
              <strong>Sin resultados</strong>
              <p>No se encontró ningún beneficiario con el DNI {dni}.</p>
              <button type="button" className="consulta-new" onClick={clear}>
                <IconRefresh width={18} height={18} />
                Nueva consulta
              </button>
            </div>
          )}

          {result?.items.map((item, index) => (
            <ResultCard
              key={`${item.num}-${index}`}
              item={item}
              isSuperAdmin={user?.rol === 'SUPER_ADMIN'}
              onChanged={refresh}
            />
          ))}

          {result?.encontrado && (
            <button type="button" className="consulta-new consulta-again" onClick={clear}>
              <IconRefresh width={18} height={18} />
              Nueva consulta
            </button>
          )}
        </div>

        <footer className="consulta-footer">© {new Date().getFullYear()} IPC INSEP</footer>
      </main>
    </div>
  );
}
