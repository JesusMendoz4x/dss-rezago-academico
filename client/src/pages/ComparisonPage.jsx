import { useEffect, useMemo, useRef, useState } from 'react';
import { getComparison, getScenarios } from '../services/api.js';

const levels = { alto: 'Alto', medio: 'Medio', bajo: 'Bajo', sin_dictamen: 'Sin dictamen' };
const componentNames = { asistencia: 'la asistencia', desempeno: 'las calificaciones', entregas: 'las entregas', tendencia: 'la evolución de calificaciones' };
const format = (value) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(value);

function criterionChanges(a, b) {
  const changes = [];
  for (const key of Object.keys(componentNames)) {
    if (a.pesos[key] !== b.pesos[key]) changes.push(`El peso de ${componentNames[key]} pasa de ${format(a.pesos[key] * 100)} % a ${format(b.pesos[key] * 100)} %.`);
  }
  if (a.umbrales.alto !== b.umbrales.alto) changes.push(`El riesgo alto empieza en ${b.umbrales.alto} puntos, en lugar de ${a.umbrales.alto}.`);
  if (a.umbrales.medio !== b.umbrales.medio) changes.push(`El riesgo medio empieza en ${b.umbrales.medio} puntos, en lugar de ${a.umbrales.medio}.`);
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
function OptionResult({ title, config, value }) {
  return <div className="option-result">
    <p className="option-label">{title}</p><h3>{config.nombre}</h3>
    <span className={`action-badge risk-${value.level}`}>{levels[value.level]}</span>
    <p className="option-action">{value.action}</p>
    {value.index == null ? <p className="option-missing">No hay información suficiente para calcular el riesgo.</p> : <>
      <div className="option-score"><strong>{format(value.index)}</strong><span> / 100 puntos</span></div>
      <meter min="0" max="100" value={value.index} aria-label={`Índice con ${config.nombre}`} />
      <p className="option-position">Lugar {value.position} en la lista de seguimiento</p>
    </>}
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
  const changedRecommendations = filtered.filter((student) => student.levelChanged).length;
  const changedPositions = filtered.filter((student) => student.positionChange != null && student.positionChange !== 0).length;

  return <div className="comparison-workspace">
    <div className="page-heading"><div><p className="section-kicker">EXPLORAR OPCIONES</p><h1>¿Qué cambia en el seguimiento?</h1><p>Prueba otros criterios y revisa si un estudiante necesita una atención diferente.</p></div>
      <button type="button" className="button-secondary" disabled={status === 'loading'} onClick={() => setRevision((value) => value + 1)}>Actualizar</button>
    </div>
    <section className="comparison-question" aria-label="Opciones a comparar">
      <div className="filter-bar">
        <label>Tomar como referencia<select value={left} onChange={(event) => setLeft(event.target.value)}>{!configs.length && <option value="base">Base</option>}{configs.map((config) => <option key={config.id} value={config.id}>{config.nombre}</option>)}</select></label>
        <label>¿Qué pasa si uso…?<select value={right} onChange={(event) => setRight(event.target.value)}>{!configs.length && <option value="asistencia">Prioridad a asistencia</option>}{configs.map((config) => <option key={config.id} value={config.id}>{config.nombre}</option>)}</select></label>
      </div>
      {status === 'ready' && result && <details className="criteria-changes"><summary>Qué criterios cambian</summary>
        {changes.length ? <ul>{changes.map((change) => <li key={change}>{change}</li>)}</ul> : <p>Ambas opciones usan los mismos criterios.</p>}
      </details>}
    </section>
    {status === 'loading' && <p className="feedback" role="status">Comparando las opciones…</p>}
    {status === 'error' && <p className="feedback feedback-error" role="alert">{error}</p>}
    {status === 'ready' && result && <>
      <section className="comparison-reading" aria-label="Conclusión de la comparación">
        <h2>{filtered.length === 0 ? 'No hay estudiantes con estos filtros.' : filtered.every((student) => student.left.level === 'sin_dictamen' && student.right.level === 'sin_dictamen') ? 'Faltan datos para comparar el seguimiento.' : changedRecommendations === 0 ? 'Se mantiene el tipo de seguimiento.' : `El seguimiento cambia para ${changedRecommendations} ${changedRecommendations === 1 ? 'estudiante' : 'estudiantes'}.`}</h2>
        <p>{filtered.length === 0 ? '' : filtered.every((student) => student.positionChange == null) ? 'No hay posiciones comparables entre los estudiantes mostrados.' : changedPositions === 0 ? 'No hay cambios de posición entre los estudiantes mostrados.' : `${changedPositions} ${changedPositions === 1 ? 'estudiante cambia' : 'estudiantes cambian'} de posición.`} <span>Corte: {result.manifest.configuration.fecha_corte}.</span></p>
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
            }}><span><strong>{student.id}</strong><small>{student.group}</small></span><span className="person-outcome">{student.levelChanged ? 'Cambia el seguimiento' : student.changed ? 'Cambia la puntuación o posición' : 'Sin cambios'}</span></button></li>)}
          </ul>}
        </section>
        <section id="comparison-person-detail" className="comparison-person-detail" aria-labelledby={selected ? 'comparison-person-title' : undefined}>
          {!selected ? <p className="feedback">Selecciona otros filtros para consultar un estudiante.</p> : <>
            <div className="person-detail-heading"><span className="section-kicker">{selected.group}</span><h2 id="comparison-person-title" ref={detailHeading} tabIndex={-1}>{selected.id}</h2><p>{outcome(selected)}</p></div>
            <div className="option-results"><OptionResult title="REFERENCIA" config={result.left} value={selected.left} /><OptionResult title="OTRA OPCIÓN" config={result.right} value={selected.right} /></div>
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
