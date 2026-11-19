import { useEffect, useMemo, useRef, useState } from 'react';
import { getRecommendations, getScenarios } from '../services/api.js';

const levels = { alto: 'Alto', medio: 'Medio', bajo: 'Bajo', sin_dictamen: 'Sin dictamen' };
const names = { asistencia: 'Asistencia', desempeno: 'Desempeño', entregas: 'Entregas', tendencia: 'Tendencia' };
const format = (value) => value == null ? 'No calculable' : new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(value);

export default function DashboardPage() {
  const [scenarios, setScenarios] = useState([]);
  const [scenario, setScenario] = useState('base');
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [group, setGroup] = useState('');
  const [level, setLevel] = useState('');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const heading = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading'); setResult(null); setError(''); setSelectedId(null);
    Promise.all([getScenarios(controller.signal), getRecommendations(scenario, controller.signal)])
      .then(([configs, data]) => { setScenarios(configs); setResult(data); setStatus('ready'); })
      .catch((cause) => { if (cause.name !== 'AbortError') { setError(cause.message); setStatus('error'); } });
    return () => controller.abort();
  }, [scenario, revision]);

  const students = result?.students || [];
  const groups = [...new Set(students.map((student) => student.group))].sort();
  const filtered = useMemo(() => (result?.students || []).filter((student) => (
    (!group || student.group === group) && (!level || student.level === level)
    && student.id.toLowerCase().includes(query.trim().toLowerCase())
  )), [result, group, level, query]);
  const selected = filtered.find((student) => student.id === selectedId);
  useEffect(() => { if (selectedId) heading.current?.focus(); }, [selectedId]);

  return (
    <>
      <div className="page-heading"><div><p className="section-kicker">EVIDENCIA PARA ACOMPAÑAR</p><h1>Resumen académico</h1><p>Identifica a quién dar seguimiento y comprende qué sustenta cada prioridad.</p></div>
        <button type="button" className="button-secondary" disabled={status === 'loading'} onClick={() => setRevision((value) => value + 1)}>Actualizar análisis</button>
      </div>

      <div className="filter-bar">
        <label>Escenario<select value={scenario} onChange={(event) => { setSelectedId(null); setScenario(event.target.value); }}>
          {!scenarios.length && <option value="base">Base</option>}{scenarios.map((config) => <option key={config.id} value={config.id}>{config.nombre}</option>)}
        </select></label>
      </div>
      {status === 'loading' && <p className="feedback" role="status">Calculando indicadores y prioridades…</p>}
      {status === 'error' && <p className="feedback feedback-error" role="alert">{error}</p>}
      {status === 'ready' && result && <>
        <p className="results-count">Corte: {result.manifest.configuration.fecha_corte} · {result.scenario.ventanaSemanas ? `Últimas ${result.scenario.ventanaSemanas} semanas` : 'Periodo completo'} · {students.length} estudiantes</p>
        <section className="metric-grid risk-summary" aria-label="Resumen de todos los estudiantes del escenario">
          {Object.entries(levels).map(([key, label]) => <article className={`metric-card summary-${key}`} key={key}><p>{label}</p><strong>{students.filter((student) => student.level === key).length}</strong></article>)}
        </section>

        <section className="quality-section" aria-labelledby="priorities-title">
          <div className="section-heading"><div><h2 id="priorities-title">Prioridad de seguimiento</h2></div></div>
          <div className="filter-bar">
            <label>Grupo<select value={group} onChange={(event) => { setGroup(event.target.value); setSelectedId(null); }}><option value="">Todos los grupos</option>{groups.map((name) => <option key={name}>{name}</option>)}</select></label>
            <label>Nivel<select value={level} onChange={(event) => { setLevel(event.target.value); setSelectedId(null); }}><option value="">Todos los niveles</option>{Object.entries(levels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <label>Buscar código<input type="search" value={query} placeholder="Ej. E-0007" onChange={(event) => { setQuery(event.target.value); setSelectedId(null); }} /></label>
          </div>
          <p className="results-count" role="status">{filtered.length} estudiantes en la lista</p>
          {!filtered.length ? <p className="feedback">No hay estudiantes con estos filtros.</p> : <div className="table-scroll" role="region" aria-label="Lista priorizada, desplazamiento horizontal" tabIndex={0}>
            <table className="students-table"><caption className="sr-only">Prioridad y acción sugerida por estudiante</caption><thead><tr>{['Posición general', 'Estudiante', 'Grupo', 'Índice / 100', 'Nivel', 'Tipo', 'Acción sugerida', 'Explicación'].map((name) => <th scope="col" key={name}>{name}</th>)}</tr></thead>
              <tbody>{filtered.map((student) => <tr key={student.id} className={selectedId === student.id ? 'selected-row' : ''}>
                <td>{student.position ?? 'No aplica'}</td><th scope="row">{student.id}</th><td>{student.group}</td><td>{student.index == null ? 'Sin dictamen' : format(student.index)}</td>
                <td><span className={`action-badge risk-${student.level}`}>{levels[student.level]}</span></td><td>{student.riskType || 'No aplica'}</td><td className="recommendation-action">{student.action}</td>
                <td><button type="button" className="text-button" aria-label={`Explicar ${student.id}`} aria-expanded={selectedId === student.id} onClick={() => setSelectedId(student.id)}>Ver motivos</button></td>
              </tr>)}</tbody>
            </table>
          </div>}
        </section>
        {selected && <section className="student-detail" aria-labelledby="risk-detail-title">
          <div className="section-heading"><div><p className="section-kicker">RECOMENDACIÓN EXPLICABLE</p><h2 id="risk-detail-title" tabIndex={-1} ref={heading}>{selected.id} · {levels[selected.level]}</h2><p>{selected.action}</p></div>
            <button type="button" className="button-secondary" onClick={() => { document.querySelector(`[aria-label="Explicar ${selected.id}"]`)?.focus(); setSelectedId(null); }}>Cerrar explicación</button>
          </div>
          {selected.index != null && <><p className="risk-score">{format(selected.index)} <span>de 100 puntos</span></p>
            <div className="table-scroll" role="region" aria-label="Cálculo del índice, desplazamiento horizontal" tabIndex={0}><table><caption className="sr-only">Componentes del índice de {selected.id}</caption><thead><tr>{['Componente', 'Indicador', 'Riesgo / 100', 'Peso original', 'Peso efectivo', 'Aportación'].map((name) => <th scope="col" key={name}>{name}</th>)}</tr></thead>
              <tbody>{selected.components.map((part) => <tr key={part.name}><th scope="row">{names[part.name]}</th><td>{format(part.value)}{['asistencia', 'entregas'].includes(part.name) ? ' %' : ''}</td><td>{format(part.risk)}</td><td>{format(part.originalWeight * 100)} %</td><td>{format(part.effectiveWeight * 100)} %</td><td>{format(part.contribution)}</td></tr>)}</tbody>
            </table></div></>}
          {selected.missing.length > 0 && <div className="feedback"><strong>Información pendiente</strong><ul>{selected.missing.map((text) => <li key={text}>{text}</li>)}</ul></div>}
          {selected.warnings.length > 0 && <ul className="indicator-warnings">{selected.warnings.map((text) => <li key={text}>{text}</li>)}</ul>}
          <details className="trace-details"><summary>Datos y configuración utilizados</summary>
            <p>Ventana: {selected.window.start || result.manifest.configuration.periodo_inicio} a {selected.window.end}. Configuración: {result.scenario.nombre}, versión {result.scenario.version}.</p>
            <p>Sesiones: {selected.counts.sessions} · Evaluaciones: {selected.counts.evaluations} · Actividades vencidas: {selected.counts.dueActivities}.</p>
            <p>Huella de las fuentes:</p><code>{result.manifest.fingerprint}</code>
            {Object.entries(selected.sources).map(([key, rows]) => <details key={key}><summary>{({ attendance: 'Asistencia', evaluations: 'Evaluaciones', submissions: 'Entregas' })[key]}: {rows.length} registros</summary><ul>{rows.map((row) => <li key={row.fila}>{row.archivo}, línea {row.fila}: {row.values.join(' · ')}</li>)}</ul></details>)}
          </details>
        </section>}

      </>}
    </>
  );
}
