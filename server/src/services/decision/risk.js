const fields = {
  asistencia: 'attendance', desempeno: 'average', entregas: 'submissions', tendencia: 'trend',
};

export function validateScenario(config) {
  const names = Object.keys(fields);
  if (!config || !config.pesos || Object.keys(config.pesos).length !== names.length
      || names.some((name) => !Number.isFinite(config.pesos[name]) || config.pesos[name] < 0)
      || Math.abs(Object.values(config.pesos).reduce((a, b) => a + b, 0) - 1) > 1e-9) {
    throw new Error('Los cuatro pesos deben ser no negativos y sumar 1');
  }
  for (const name of names) {
    const range = config.rangos?.[name];
    if (!Number.isFinite(range?.sinRiesgo) || !Number.isFinite(range?.maximoRiesgo) || range.sinRiesgo <= range.maximoRiesgo) {
      throw new Error(`Rango inválido: ${name}`);
    }
  }
  const u = config.umbrales;
  if (!Number.isFinite(u?.medio) || !Number.isFinite(u?.alto) || !(0 <= u.medio && u.medio < u.alto && u.alto <= 100)) throw new Error('Umbrales inválidos');
  if (![null, 4].includes(config.ventanaSemanas)) throw new Error('Ventana inválida');
  if (!Number.isInteger(config.minimos?.sesiones) || config.minimos.sesiones < 1
    || !Number.isInteger(config.minimos?.evaluaciones) || config.minimos.evaluaciones < 2) throw new Error('Mínimos inválidos');
}

export function evaluateProfile(profile, config) {
  validateScenario(config);
  const warnings = [...profile.warnings];
  const missing = [...profile.missing];
  if (profile.counts.sessions < config.minimos.sesiones && !missing.length) missing.push('Faltan sesiones');
  if (profile.counts.evaluations < config.minimos.evaluaciones && !missing.length) missing.push('Faltan evaluaciones');
  if (profile.indicators.attendance == null || profile.indicators.average == null) missing.push('Falta asistencia o promedio calculable');
  const result = {
    ...profile, index: null, level: 'sin_dictamen', riskType: null,
    action: 'Completar la información antes de emitir una recomendación',
    components: [], warnings, missing,
  };
  if (profile.counts.sessions < config.minimos.sesiones || profile.counts.evaluations < config.minimos.evaluaciones || missing.length) return result;
  const available = [];
  for (const [name, field] of Object.entries(fields)) {
    const value = profile.indicators[field];
    if (value == null) { warnings.push(`${name}: componente excluido; pesos disponibles renormalizados.`); continue; }
    if (!Number.isFinite(value)) throw new Error(`Indicador no finito: ${field}`);
    const range = config.rangos[name];
    const risk = Math.max(0, Math.min(100, (range.sinRiesgo - value) / (range.sinRiesgo - range.maximoRiesgo) * 100));
    available.push({ name, value, risk, originalWeight: config.pesos[name] });
  }
  const totalWeight = available.reduce((sum, item) => sum + item.originalWeight, 0);
  if (totalWeight === 0) { result.missing.push('No hay componentes disponibles con peso positivo'); return result; }
  // Con todos los componentes se usan los pesos originales; renormalizar solo al excluir.
  const denominator = available.length === Object.keys(fields).length ? 1 : totalWeight;
  const components = available.map((item) => ({ ...item, effectiveWeight: item.originalWeight / denominator, contribution: item.risk * item.originalWeight / denominator }));
  const index = components.reduce((sum, item) => sum + item.contribution, 0);
  const level = index >= config.umbrales.alto ? 'alto' : index >= config.umbrales.medio ? 'medio' : 'bajo';
  const a = components.find((item) => item.name === 'asistencia').risk >= 50;
  const d = components.find((item) => item.name === 'desempeno').risk >= 50;
  const riskType = a && d ? 'mixto' : a ? 'asistencia' : d ? 'académico' : level === 'bajo' ? 'sin predominio' : 'general';
  const actions = { alto: 'Intervención prioritaria esta semana', medio: 'Seguimiento cercano', bajo: 'Monitoreo regular' };
  return { ...result, index, level, riskType, action: actions[level], components,
    rule: `Alto desde ${config.umbrales.alto}; medio desde ${config.umbrales.medio}; bajo por debajo de ${config.umbrales.medio}. Clasificación sin redondear.` };
}

export function prioritize(profiles, config) {
  return profiles.map((profile) => evaluateProfile(profile, config))
    .sort((a, b) => (b.index ?? -1) - (a.index ?? -1) || a.id.localeCompare(b.id))
    .map((profile, index) => ({ ...profile, position: profile.index == null ? null : index + 1 }));
}
