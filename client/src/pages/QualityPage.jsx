import { useEffect, useMemo, useState } from 'react';
import { getQuality } from '../services/api.js';

const actions = { corrected: 'Corrección', rejected: 'Rechazo', duplicate: 'Duplicado', conflict: 'Conflicto' };
const metrics = [
  ['leidos', 'Registros leídos'], ['aceptados', 'Aceptados'], ['corregidos', 'Corregidos'],
  ['rechazados', 'Rechazados'], ['duplicados', 'Duplicados'], ['conflictos', 'En conflicto'],
];
const number = new Intl.NumberFormat('es-MX');

export default function QualityPage() {
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [file, setFile] = useState('');
  const [action, setAction] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    setError('');
    setResult(null);
    getQuality(controller.signal).then((data) => {
      setResult(data);
      setStatus('ready');
    }).catch((cause) => {
      if (cause.name !== 'AbortError') {
        setError(cause.message);
        setStatus('error');
      }
    });
    return () => controller.abort();
  }, [revision]);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('es');
    return (result?.anomalies || []).filter((item) => (
      (!file || item.archivo === file) && (!action || item.accion === action)
      && (!term || [item.archivo, item.campo, item.original, item.normalizado, item.motivo]
        .some((value) => String(value ?? '').toLocaleLowerCase('es').includes(term)))
    ));
  }, [result, file, action, query]);

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="section-kicker">ANTES DE INTERPRETAR, VERIFICAR</p>
          <h1>Calidad de datos</h1>
          <p>Revisa cómo se preparan las fuentes que sostendrán el seguimiento académico.</p>
        </div>
        <button className="button-secondary" type="button" disabled={status === 'loading'} onClick={() => setRevision((value) => value + 1)}>
          {status === 'loading' ? 'Validando…' : 'Volver a validar'}
        </button>
      </div>
      <p className="validation-note">Validación de los CSV actuales. Esta consulta no guarda evidencias ni carga datos en MySQL.</p>
      {status === 'loading' && <p className="feedback" role="status">Leyendo y validando las fuentes académicas…</p>}
      {status === 'error' && <p className="feedback feedback-error" role="alert">{error}</p>}
      {status === 'ready' && result && (
        <>
          <section className="metric-grid" aria-label="Resumen de calidad">
            {metrics.map(([key, label]) => (
              <article className={`metric-card metric-${key}`} key={key}>
                <p>{label}</p><strong>{number.format(result.report.totales[key])}</strong>
              </article>
            ))}
          </section>
          <p className="metric-explanation">Los corregidos están incluidos en los aceptados. Leídos = aceptados + rechazados + duplicados + conflictos.</p>
          <section className="quality-section" aria-labelledby="sources-title">
            <div className="section-heading"><div><h2 id="sources-title">Resultado por fuente</h2><p>Fecha de corte: {result.manifest.configuration.fecha_corte}. Se conserva el origen de cada incidencia.</p></div></div>
            <div className="table-scroll" role="region" aria-label="Conteos por archivo, desplazamiento horizontal" tabIndex={0}>
              <table>
                <caption className="sr-only">Registros procesados por cada fuente CSV</caption>
                <thead><tr><th scope="col">Archivo</th>{metrics.map(([key, label]) => <th scope="col" className="numeric" key={key}>{label}</th>)}</tr></thead>
                <tbody>{Object.entries(result.report.archivos).map(([name, counts]) => (
                  <tr key={name}><th scope="row">{name}</th>{metrics.map(([key]) => <td className="numeric" key={key}>{number.format(counts[key])}</td>)}</tr>
                ))}</tbody>
              </table>
            </div>
          </section>
          <section className="quality-section" aria-labelledby="anomalies-title">
            <div className="section-heading"><div><h2 id="anomalies-title">Detalle de incidencias</h2><p>Consulta el valor de origen, su tratamiento y la regla aplicada. Una fila puede generar varias incidencias.</p></div></div>
            <div className="filter-bar">
              <label>Fuente<select value={file} onChange={(event) => setFile(event.target.value)}>
                <option value="">Todas las fuentes</option>{Object.keys(result.report.archivos).map((name) => <option key={name} value={name}>{name}</option>)}
              </select></label>
              <label>Tratamiento<select value={action} onChange={(event) => setAction(event.target.value)}>
                <option value="">Todos los tratamientos</option>{Object.entries(actions).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select></label>
              <label className="filter-search">Buscar<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Campo, valor o motivo" /></label>
            </div>
            <p className="results-count" role="status">{filtered.length} de {result.anomalies.length} incidencias</p>
            {filtered.length === 0 ? <p className="feedback">{result.anomalies.length === 0 ? 'No se detectaron incidencias en las fuentes.' : 'No hay incidencias con estos filtros.'}</p> : (
              <div className="table-scroll" role="region" aria-label="Detalle de incidencias, desplazamiento horizontal" tabIndex={0}>
                <table className="anomalies-table">
                  <caption className="sr-only">Trazabilidad de las incidencias encontradas por el ETL</caption>
                  <thead><tr>{['Origen', 'Tratamiento', 'Campo', 'Original', 'Normalizado', 'Motivo'].map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead>
                  <tbody>{filtered.map((item, index) => (
                    <tr key={`${item.archivo}-${item.fila}-${item.campo}-${item.accion}-${index}`}>
                      <td><strong>{item.archivo}</strong><span className="cell-detail">Línea {item.fila}</span></td>
                      <td><span className={`action-badge action-${item.accion}`}>{actions[item.accion] || item.accion}</span></td>
                      <td>{item.campo === '*' ? 'Registro completo' : item.campo}</td>
                      <td className="value-cell">{item.original === '' ? <em>Vacío</em> : item.original}</td>
                      <td className="value-cell">{item.normalizado == null ? <span className="muted">No aplica</span> : item.normalizado}</td>
                      <td>{item.motivo}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </section>
          <details className="trace-details"><summary>Identificación de las fuentes validadas</summary><p>La huella identifica el contenido y los parámetros de esta validación; no es un ID de importación en MySQL.</p><code>{result.manifest.fingerprint}</code></details>
        </>
      )}
    </>
  );
}
