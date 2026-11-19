import { useEffect, useMemo, useRef, useState } from 'react';
import { getComparison, getScenarios } from '../services/api.js';

const levels = { alto: 'Alto', medio: 'Medio', bajo: 'Bajo', sin_dictamen: 'Sin dictamen' };
const componentNames = { asistencia: 'la asistencia', desempeno: 'las calificaciones', entregas: 'las entregas', tendencia: 'la evolución de calificaciones' };
const format = (value) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(value);

function criterionChanges(a, b) {
  const changes = [];
  for (const key of Object.keys(componentNames)) {
    if (a.pesos[key] !== b.pesos[key]) changes.push(`La importancia de ${componentNames[key]} en la puntuación pasa de ${format(a.pesos[key] * 100)} % a ${format(b.pesos[key] * 100)} %.`);
  }
  if (a.umbrales.alto !== b.umbrales.alto) changes.push(`Se recomienda atención prioritaria desde ${b.umbrales.alto} puntos; antes se necesitaban ${a.umbrales.alto}.`);
  if (a.umbrales.medio !== b.umbrales.medio) changes.push(`Se recomienda seguimiento cercano desde ${b.umbrales.medio} puntos; antes se necesitaban ${a.umbrales.medio}.`);
  if (a.ventanaSemanas !== b.ventanaSemanas) changes.push(`Se pasa de ${a.ventanaSemanas ? `las últimas ${a.ventanaSemanas} semanas` : 'todo el periodo'} a ${b.ventanaSemanas ? `las últimas ${b.ventanaSemanas} semanas` : 'todo el periodo'}.`);
  return changes;
}
function outcome(student) {
  if (student.left.level === 'sin_dictamen' && student.right.level === 'sin_dictamen') return 'Faltan datos con ambas opciones';
  if (student.right.level === 'sin_dictamen') return 'Con esta opción faltan datos';
  if (student.left.level === 'sin_dictamen') return 'Ahora se puede recomendar seguimiento';
  if (!student.levelChanged) return 'La recomendación se mantiene';
  if (student.right.level === 'alto') return 'Pasa a atención prioritaria';
  if (student.right.level === 'medio') return 'Pasa a seguimiento cercano';
  return 'Pasa a monitoreo regular';
}
const intentions = {
  base: { label: 'Combinar los cuatro indicadores' },
  asistencia: { label: 'Dar más importancia a faltar a clases' },
  sensible: { label: 'Recomendar atención desde menos puntos' },
  'ventana-corta': { label: 'Revisar solo las últimas semanas' },
};
function ScoreChange({ student, leftName, rightName }) {
  if (student.left.index == null || student.right.index == null) return <div className="score-unavailable">Faltan datos para comparar ambas puntuaciones.</div>;
  const x = (value) => 32 + Math.max(0, Math.min(100, value)) * 4.96;
  return <figure className="score-change">
    <figcaption>Puntuación de riesgo <span>Una puntuación mayor indica más riesgo.</span></figcaption>
    <div className="score-plot" role="region" aria-label="Gráfica de puntuaciones, desplazamiento horizontal" tabIndex={0}><svg viewBox="0 0 560 160" role="img" aria-label={`${leftName}: ${format(student.left.index)} puntos. ${rightName}: ${format(student.right.index)} puntos.`}>
      {[0, 25, 50, 75, 100].map((value) => <g key={value}><line x1={x(value)} x2={x(value)} y1="28" y2="120" className="score-grid" /><text x={x(value)} y="147" textAnchor="middle">{value}</text></g>)}
      <line x1="32" x2="528" y1="48" y2="48" className="score-rail" />
      <line x1="32" x2="528" y1="104" y2="104" className="score-rail" />
      <line x1={x(student.left.index)} x2={x(student.right.index)} y1="48" y2="104" className="score-connection" />
      <circle cx={x(student.left.index)} cy="48" r="7" className="score-before" />
      <circle cx={x(student.right.index)} cy="104" r="7" className="score-after" />
      <text x={x(student.left.index)} y="30" textAnchor="middle" className="score-value">{format(student.left.index)}</text>
      <text x={x(student.right.index)} y="86" textAnchor="middle" className="score-value">{format(student.right.index)}</text>
    </svg></div>
    <div className="score-legend"><span><i className="legend-before" aria-hidden="true" />Referencia: {leftName}</span><span><i className="legend-after" aria-hidden="true" />Alternativa: {rightName}</span></div>
  </figure>;
}
function OptionResult({ title, config, value }) {
  return <div className="option-result">
    <p className="option-label">{title}</p><h3>{config.nombre}</h3>
    <p className="option-action">{value.action}</p>
    <span className={`action-badge risk-${value.level}`}>{levels[value.level]}</span>
    {value.position != null && <p className="option-position">Lugar {value.position} en la lista</p>}
  </div>;
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
  const [selectedId, setSelectedId] = useState(null);
  const detailHeading = useRef(null);
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
  const selected = filtered.find((student) => student.id === selectedId) || filtered[0];
  const changes = result ? criterionChanges(result.left, result.right) : [];
  const optionConfig = configs.find((config) => config.id === right);
  const changedScores = filtered.filter((student) => student.delta != null && Math.abs(student.delta) > 1e-9).length;
  const changedRecommendations = filtered.filter((student) => student.levelChanged).length;
  const changedPositions = filtered.filter((student) => student.positionChange != null && student.positionChange !== 0).length;

  return <div className="comparison-workspace">
    <div className="page-heading"><div><p className="section-kicker">EXPLORAR OPCIONES</p><h1>¿A quién atendería primero?</h1><p>Elige qué información tendrá más importancia al recomendar el seguimiento.</p></div>
      <button type="button" className="button-secondary" disabled={status === 'loading'} onClick={() => setRevision((value) => value + 1)}>Actualizar</button>
    </div>
    <section className="comparison-question" aria-label="Opciones a comparar">
      <details className="reference-control"><summary>Referencia: {configs.find((config) => config.id === left)?.nombre || 'Revisión general'}</summary>
        <label>Cambiar referencia<select value={left} onChange={(event) => setLeft(event.target.value)}>{!configs.length && <option value="base">Revisión general</option>}{configs.map((config) => <option key={config.id} value={config.id}>{config.nombre}</option>)}</select></label>
      </details>
      <fieldset className="intention-picker"><legend>¿Qué quieres explorar?</legend>
        <div className="intention-options">{(configs.length ? configs : [{ id: 'asistencia', nombre: 'Prioridad a asistencia' }]).map((config) => <label className={right === config.id ? 'is-chosen' : ''} key={config.id}>
          <input type="radio" name="comparison-intention" value={config.id} checked={right === config.id} onChange={() => setRight(config.id)} />
          <span>{intentions[config.id]?.label || config.nombre}</span>
        </label>)}</div>
      </fieldset>
      {optionConfig && <p className="intention-description">{right === 'asistencia' ? `La asistencia representa el ${format(optionConfig.pesos.asistencia * 100)} % de la puntuación.` : right === 'sensible' ? `Se recomienda atención prioritaria al llegar a ${optionConfig.umbrales.alto} puntos de riesgo.` : optionConfig.ventanaSemanas ? `Se analizan las últimas ${optionConfig.ventanaSemanas} semanas.` : 'Se combinan asistencia, calificaciones, actividades entregadas y evolución de las calificaciones durante todo el periodo.'}</p>}
      {status === 'ready' && result && <details className="criteria-changes"><summary>Qué cambia en el cálculo</summary>
        {changes.length ? <ul>{changes.map((change) => <li key={change}>{change}</li>)}</ul> : <p>Ambas opciones dan la misma importancia a los indicadores y recomiendan atención desde los mismos puntos.</p>}
      </details>}
    </section>
    {status === 'loading' && <p className="feedback" role="status">Comparando las opciones…</p>}
    {status === 'error' && <p className="feedback feedback-error" role="alert">{error}</p>}
    {status === 'ready' && result && <>
      <section className="comparison-reading" aria-label="Conclusión de la comparación">
        <h2>{filtered.length === 0 ? 'No hay estudiantes con estos filtros.' : filtered.every((student) => student.left.level === 'sin_dictamen' && student.right.level === 'sin_dictamen') ? 'Faltan datos para comparar el seguimiento.' : changedRecommendations === 0 ? 'Se mantiene el tipo de seguimiento.' : `El seguimiento cambia para ${changedRecommendations} ${changedRecommendations === 1 ? 'estudiante' : 'estudiantes'}.`}</h2>
        <p>{filtered.length === 0 ? '' : filtered.every((student) => student.positionChange == null) ? 'No hay posiciones comparables entre los estudiantes mostrados.' : changedPositions === 0 ? 'No hay cambios de posición entre los estudiantes mostrados.' : `${changedPositions} ${changedPositions === 1 ? 'estudiante cambia' : 'estudiantes cambian'} de posición.`} <span>{changedScores} {changedScores === 1 ? 'puntuación cambia' : 'puntuaciones cambian'}. Corte: {result.manifest.configuration.fecha_corte}.</span></p>
      </section>
      <div className="comparison-explorer">
        <section className="comparison-people" aria-labelledby="people-title">
          <h2 id="people-title">Elegir un estudiante</h2>
          <div className="filter-bar">
            <label>Grupo<select value={group} onChange={(event) => setGroup(event.target.value)}><option value="">Todos</option>{groups.map((name) => <option key={name}>{name}</option>)}</select></label>
            <label>Buscar código<input type="search" value={query} placeholder="Ej. E-0007" onChange={(event) => setQuery(event.target.value)} /></label>
          </div>
          <label className="checkbox-filter"><input type="checkbox" checked={onlyChanges} onChange={(event) => setOnlyChanges(event.target.checked)} />Solo con cambios</label>
          <p className="results-count" role="status">{filtered.length} estudiantes</p>
          {!filtered.length ? <p className="feedback">No hay estudiantes con estos filtros.</p> : <ul className="comparison-person-list">
            {filtered.map((student) => <li key={student.id}><button type="button" aria-pressed={selected?.id === student.id} aria-controls="comparison-person-detail" onClick={() => {
              setSelectedId(student.id);
              // El panel ya existe; llevar el foco a su encabezado en la siguiente pintura.
              requestAnimationFrame(() => detailHeading.current?.focus());
            }}><span><strong>{student.id}</strong><small>{student.group}</small></span><span className="person-outcome">{student.levelChanged ? 'Cambia el seguimiento' : student.changed ? 'Cambia la puntuación o posición' : student.left.level === 'sin_dictamen' ? 'Faltan datos' : 'Mismo seguimiento'}</span></button></li>)}
          </ul>}
        </section>
        <section id="comparison-person-detail" className="comparison-person-detail" aria-labelledby={selected ? 'comparison-person-title' : undefined}>
          {!selected ? <p className="feedback">Selecciona otros filtros para consultar un estudiante.</p> : <>
            <div className="person-detail-heading"><span className="section-kicker">{selected.group}</span><h2 id="comparison-person-title" ref={detailHeading} tabIndex={-1}>{selected.id}</h2><p>{outcome(selected)}</p></div>
            <ScoreChange student={selected} leftName={result.left.nombre} rightName={result.right.nombre} />
            <div className="option-results"><OptionResult title="REFERENCIA" config={result.left} value={selected.left} /><OptionResult title="CON EL CAMBIO" config={result.right} value={selected.right} /></div>
            <div className="comparison-takeaway">
              <h3>Qué significa para este estudiante</h3>
              <p>{selected.delta == null ? 'No se pueden comparar las puntuaciones porque falta información en al menos una opción.' : Math.abs(selected.delta) < 1e-9 ? 'Su puntuación de riesgo no cambia.' : `Su puntuación de riesgo ${selected.delta > 0 ? 'aumenta' : 'disminuye'} ${format(Math.abs(selected.delta))} puntos.`}</p>
              {selected.positionChange != null && <p>{selected.positionChange === 0 ? 'Conserva su lugar en la lista de seguimiento.' : `Queda ${Math.abs(selected.positionChange)} ${Math.abs(selected.positionChange) === 1 ? 'lugar' : 'lugares'} ${selected.positionChange > 0 ? 'más cerca del inicio' : 'más abajo'} de la lista.`}</p>}
            </div>
          </>}
        </section>
      </div>
    </>}
  </div>;
}
