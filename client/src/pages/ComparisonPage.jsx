import { useEffect, useMemo, useState } from 'react';
import { getComparison, getScenarios } from '../services/api.js';

const levels = { alto: 'Alto', medio: 'Medio', bajo: 'Bajo', sin_dictamen: 'Sin dictamen' };
const componentNames = { asistencia: 'Asistencia', desempeno: 'Desempeño', entregas: 'Entregas', tendencia: 'Tendencia' };
const format = (value) => value == null ? 'No calculable' : new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(value);
function difference(value) {
  if (value == null) return 'No comparable';
  return Math.abs(value) < 1e-9 ? 'Sin cambio' : `${value > 0 ? '+' : ''}${format(value)} puntos`;
}
function ScenarioCard({ config, label }) {
  return <article className="scenario-card"><p className="section-kicker">{label}</p><h2>{config.nombre}</h2><dl>
    <div><dt>Prioridad alta</dt><dd>Desde {config.umbrales.alto} puntos</dd></div>
    <div><dt>Seguimiento cercano</dt><dd>Desde {config.umbrales.medio} puntos</dd></div>
    <div><dt>Periodo</dt><dd>{config.ventanaSemanas ? `Últimas ${config.ventanaSemanas} semanas` : 'Completo'}</dd></div>
    {Object.entries(config.pesos).map(([key, weight]) => <div key={key}><dt>{componentNames[key]}</dt><dd>{format(weight * 100)} %</dd></div>)}
  </dl></article>;
}

export default function ComparisonPage() {
  const [left, setLeft] = useState('base');
  const [right, setRight] = useState('asistencia');
  const [revision, setRevision] = useState(0);
  const [configs, setConfigs] = useState([]);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [group, setGroup] = useState('');
  const [query, setQuery] = useState('');
  const [onlyChanges, setOnlyChanges] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading'); setResult(null); setError('');
    Promise.all([getScenarios(controller.signal), getComparison(left, right, controller.signal)])
      .then(([scenarios, data]) => { setConfigs(scenarios); setResult(data); setStatus('ready'); })
      .catch((cause) => { if (cause.name !== 'AbortError') { setError(cause.message); setStatus('error'); } });
    return () => controller.abort();
  }, [left, right, revision]);
  const filtered = useMemo(() => (result?.students || []).filter((student) => (
    (!group || student.group === group) && (!onlyChanges || student.changed)
    && student.id.toLowerCase().includes(query.trim().toLowerCase())
  )), [result, group, query, onlyChanges]);
  const groups = [...new Set((result?.students || []).map((student) => student.group))].sort();

  return <>
    <div className="page-heading"><div><p className="section-kicker">EXPLORAR ANTES DE DECIDIR</p><h1>Comparar escenarios</h1><p>Observa cómo los criterios modifican el seguimiento del mismo estudiante.</p></div>
      <button type="button" className="button-secondary" disabled={status === 'loading'} onClick={() => setRevision((value) => value + 1)}>Actualizar comparación</button>
    </div>
    <div className="filter-bar">
      <label>Escenario A<select value={left} onChange={(event) => setLeft(event.target.value)}>{!configs.length && <option value="base">Base</option>}{configs.map((config) => <option key={config.id} value={config.id}>{config.nombre}</option>)}</select></label>
      <label>Escenario B<select value={right} onChange={(event) => setRight(event.target.value)}>{!configs.length && <option value="asistencia">Prioridad a asistencia</option>}{configs.map((config) => <option key={config.id} value={config.id}>{config.nombre}</option>)}</select></label>
    </div>
    {status === 'loading' && <p className="feedback" role="status">Calculando ambos escenarios desde las mismas fuentes…</p>}
    {status === 'error' && <p className="feedback feedback-error" role="alert">{error}</p>}
    {status === 'ready' && result && <>
      <p className="validation-note">Datos ficticios · Corte: {result.manifest.configuration.fecha_corte}. Ambos escenarios usan las mismas fuentes; cada uno aplica su ventana y criterios. La comparación no guarda cambios.</p>
      {left === right && <p className="feedback">Elegiste el mismo escenario en ambos lados; los resultados serán iguales.</p>}
      <div className="scenario-grid comparison-configs"><ScenarioCard config={result.left} label="ESCENARIO A" /><ScenarioCard config={result.right} label="ESCENARIO B" /></div>
      <section className="metric-grid comparison-summary" aria-label="Cambios en el conjunto completo">
        {[
          ['Cambios de índice', result.students.filter((s) => s.delta != null && Math.abs(s.delta) > 1e-9).length],
          ['Cambios de nivel', result.students.filter((s) => s.levelChanged).length],
          ['Cambios de posición', result.students.filter((s) => s.positionChange != null && s.positionChange !== 0).length],
          ['Sin comparación numérica', result.students.filter((s) => s.delta == null).length],
        ].map(([label, value]) => <article className="metric-card" key={label}><p>{label}</p><strong>{value}</strong></article>)}
      </section>
      <section className="quality-section" aria-labelledby="comparison-title"><div className="section-heading"><div><h2 id="comparison-title">Resultado por estudiante</h2><p>La variación del índice es B menos A. Subir posiciones significa aparecer antes en la lista general del escenario B.</p></div></div>
        <div className="filter-bar"><label>Grupo<select value={group} onChange={(event) => setGroup(event.target.value)}><option value="">Todos los grupos</option>{groups.map((name) => <option key={name}>{name}</option>)}</select></label>
          <label>Buscar código<input type="search" value={query} placeholder="Ej. E-0007" onChange={(event) => setQuery(event.target.value)} /></label>
        </div>
        <label className="checkbox-filter"><input type="checkbox" checked={onlyChanges} onChange={(event) => setOnlyChanges(event.target.checked)} />Mostrar solo estudiantes con cambios</label>
        <p className="results-count" role="status">{filtered.length} de {result.students.length} estudiantes. Los contadores superiores corresponden al conjunto completo.</p>
        {!filtered.length ? <p className="feedback">No hay estudiantes con estos filtros. Cambiar un criterio no siempre cambia el orden o el nivel.</p> : <div className="table-scroll" role="region" aria-label="Comparación por estudiante, desplazamiento horizontal" tabIndex={0}><table className="comparison-table">
          <caption className="sr-only">Índice, nivel, prioridad y acción por escenario</caption><thead><tr>{['Estudiante', 'Grupo', 'Escenario A', 'Escenario B', 'Variación del índice', 'Posición en A / B', 'Cambio de prioridad'].map((title) => <th scope="col" key={title}>{title}</th>)}</tr></thead>
          <tbody>{filtered.map((student) => <tr key={student.id}><th scope="row">{student.id}</th><td>{student.group}</td>
            {[student.left, student.right].map((value, index) => <td key={index}><strong>{value.index == null ? 'Sin dictamen' : `${format(value.index)} / 100`}</strong><span className="cell-detail"><span className={`action-badge risk-${value.level}`}>{levels[value.level]}</span></span><span className="cell-detail">{value.action}</span></td>)}
            <td>{difference(student.delta)}</td><td>{student.left.position ?? 'Sin posición'} / {student.right.position ?? 'Sin posición'}</td>
            <td>{student.positionChange == null ? 'No comparable' : student.positionChange === 0 ? 'Sin cambio' : student.positionChange > 0 ? `Sube ${student.positionChange} posiciones` : `Baja ${-student.positionChange} posiciones`}</td>
          </tr>)}</tbody>
        </table></div>}
      </section>
      <p className="metric-explanation">Sin dictamen significa que falta información para emitir una recomendación. No equivale a riesgo cero. El índice orienta al tutor y no determina sanciones ni acreditación.</p>
    </>}
  </>;
}
