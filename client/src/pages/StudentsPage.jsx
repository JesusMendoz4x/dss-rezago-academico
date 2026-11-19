import { useEffect, useMemo, useRef, useState } from 'react';
import { getStudents } from '../services/api.js';

const decimal = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 });
const format = (value, suffix = '') => value == null ? 'No calculable' : `${decimal.format(value)}${suffix}`;
const sourceSections = [
  ['attendance', 'Sesiones registradas', ['Estudiante', 'Fecha', 'Asistió']],
  ['evaluations', 'Evaluaciones válidas', ['Estudiante', 'Evaluación', 'Fecha', 'Calificación']],
  ['submissions', 'Actividades vencidas', ['Estudiante', 'Actividad', 'Fecha límite', 'Entregada']],
];

export default function StudentsPage() {
  const [period, setPeriod] = useState('all');
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('');
  const [sufficiency, setSufficiency] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const detailHeading = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading'); setResult(null); setError(''); setSelectedId(null);
    getStudents(period, controller.signal).then((data) => {
      setResult(data); setStatus('ready');
    }).catch((cause) => {
      if (cause.name !== 'AbortError') { setError(cause.message); setStatus('error'); }
    });
    return () => controller.abort();
  }, [period, revision]);

  const groups = [...new Set((result?.students || []).map((student) => student.group))].sort();
  const filtered = useMemo(() => (result?.students || []).filter((student) => (
    (!group || student.group === group)
    && student.id.toLowerCase().includes(query.trim().toLowerCase())
    && (!sufficiency || student.sufficient === (sufficiency === 'sufficient'))
  )), [result, group, query, sufficiency]);
  const selected = filtered.find((student) => student.id === selectedId);
  useEffect(() => {
    if (selectedId) detailHeading.current?.focus();
  }, [selectedId]);

  return (
    <>
      <div className="page-heading"><div>
        <p className="section-kicker">CONOCER ANTES DE PRIORIZAR</p>
        <h1>Estudiantes</h1>
        <p>Consulta indicadores descriptivos y los registros que los sustentan.</p>
      </div><button className="button-secondary" type="button" disabled={status === 'loading'} onClick={() => setRevision((value) => value + 1)}>Actualizar datos</button></div>

      <div className="filter-bar">
        <label>Periodo<select value={period} onChange={(event) => { setSelectedId(null); setPeriod(event.target.value); }}>
          <option value="all">Periodo completo</option><option value="4">Últimas cuatro semanas</option>
        </select></label>
        <label>Grupo<select value={group} onChange={(event) => { setGroup(event.target.value); setSelectedId(null); }}>
          <option value="">Todos los grupos</option>{groups.map((name) => <option key={name} value={name}>{name}</option>)}
        </select></label>
        <label>Información<select value={sufficiency} onChange={(event) => { setSufficiency(event.target.value); setSelectedId(null); }}>
          <option value="">Todos los estudiantes</option><option value="sufficient">Mínimos cubiertos</option><option value="insufficient">Datos insuficientes</option>
        </select></label>
        <label>Buscar código<input type="search" value={query} placeholder="Ej. E-0007" onChange={(event) => { setQuery(event.target.value); setSelectedId(null); }} /></label>
      </div>
      {status === 'loading' && <p className="feedback" role="status">Validando fuentes y calculando indicadores…</p>}
      {status === 'error' && <p className="feedback feedback-error" role="alert">{error}</p>}
      {status === 'ready' && result && <>
        <p className="results-count" role="status">{filtered.length} de {result.students.length} estudiantes · Corte: {result.manifest.configuration.fecha_corte}</p>
        {!filtered.length ? <p className="feedback">No hay estudiantes con estos filtros.</p> : <div className="table-scroll" role="region" aria-label="Estudiantes, desplazamiento horizontal" tabIndex={0}>
          <table className="students-table"><caption className="sr-only">Indicadores por estudiante en el periodo seleccionado</caption>
            <thead><tr>{['Código', 'Grupo', 'Asistencia', 'Promedio', 'Entregas', 'Información', 'Detalle'].map((title) => <th scope="col" key={title}>{title}</th>)}</tr></thead>
            <tbody>{filtered.map((student) => <tr key={student.id} className={selectedId === student.id ? 'selected-row' : ''}>
              <th scope="row">{student.id}</th><td>{student.group}</td>
              <td>{format(student.indicators.attendance, ' %')}</td><td>{format(student.indicators.average)}</td><td>{format(student.indicators.submissions, ' %')}</td>
              <td><span className={`action-badge ${student.sufficient ? 'action-corrected' : 'action-duplicate'}`}>{student.sufficient ? 'Mínimos cubiertos' : 'Datos insuficientes'}</span></td>
              <td><button type="button" className="text-button" aria-label={`Ver detalle de ${student.id}`} aria-expanded={selectedId === student.id} aria-controls="student-detail" onClick={() => setSelectedId(student.id)}>Ver detalle</button></td>
            </tr>)}</tbody>
          </table>
        </div>}
        {selected && <section id="student-detail" className="student-detail" aria-labelledby="detail-title">
          <div className="section-heading"><div><p className="section-kicker">DETALLE DEL ESTUDIANTE</p><h2 id="detail-title" tabIndex={-1} ref={detailHeading}>{selected.id} · {selected.group}</h2><p>{selected.program}</p></div>
            <button className="button-secondary" type="button" onClick={() => {
              const button = document.querySelector(`[aria-label="Ver detalle de ${selected.id}"]`);
              setSelectedId(null); button?.focus();
            }}>Cerrar detalle</button>
          </div>
          <p className="metric-explanation">Desde {selected.window.start || result.manifest.configuration.periodo_inicio} hasta {selected.window.end}, ambos inclusive.</p>
          <div className="metric-grid">
            {[
              ['Asistencia', format(selected.indicators.attendance, ' %'), `${selected.counts.sessions} sesiones`],
              ['Promedio', format(selected.indicators.average), `${selected.counts.evaluations} evaluaciones · escala 0 a 10`],
              ['Entregas', format(selected.indicators.submissions, ' %'), `${selected.counts.dueActivities} actividades vencidas`],
              ['Tendencia', format(selected.indicators.trend), 'Puntos: últimas dos evaluaciones frente a las anteriores'],
            ].map(([label, value, note]) => <article className="metric-card" key={label}><p>{label}</p><strong className="student-metric-value">{value}</strong><span className="cell-detail">{note}</span></article>)}
          </div>
          {selected.missing.length > 0 && <div className="feedback"><strong>Datos insuficientes para el futuro modelo</strong><ul>{selected.missing.map((message) => <li key={message}>{message}</li>)}</ul></div>}
          {selected.warnings.length > 0 && <ul className="indicator-warnings">{selected.warnings.map((message) => <li key={message}>{message}</li>)}</ul>}

          {sourceSections.map(([key, title, headers]) => <details className="trace-details" key={key}><summary>{title} ({selected.sources[key].length})</summary>
            {!selected.sources[key].length ? <p>No hay registros válidos en esta ventana.</p> : <div className="table-scroll" role="region" aria-label={title} tabIndex={0}><table>
              <caption className="sr-only">{title} de {selected.id} y procedencia en CSV</caption><thead><tr>{[...headers, 'Origen'].map((header) => <th scope="col" key={header}>{header}</th>)}</tr></thead>
              <tbody>{selected.sources[key].map((row) => <tr key={row.fila}>{row.values.map((value, index) => <td key={index}>{value}</td>)}<td>{row.archivo}, línea {row.fila}</td></tr>)}</tbody>
            </table></div>}
          </details>)}
        </section>}
      </>}
    </>
  );
}
