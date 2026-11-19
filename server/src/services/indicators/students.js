/** Indicadores descriptivos; no emite puntuaciones ni recomendaciones de riesgo. */
export function buildStudentProfiles(clean, { cutoff, windowWeeks = null, minSessions = 4, minEvaluations = 2 }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cutoff)) throw new Error('Corte inválido');
  if (windowWeeks !== null && windowWeeks !== 4) throw new Error('Ventana no soportada');
  let start = null;
  if (windowWeeks) {
    const date = new Date(`${cutoff}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - windowWeeks * 7 + 1);
    start = date.toISOString().slice(0, 10);
  }
  const inWindow = (date) => date <= cutoff && (!start || date >= start);
  const mean = (values) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const attendance = new Map(), evaluations = new Map(), submissions = new Map();
  for (const [file, target, dateIndex] of [
    ['asistencia.csv', attendance, 1], ['evaluaciones.csv', evaluations, 2], ['entregas.csv', submissions, 2],
  ]) {
    for (const row of clean[file]) {
      if (!inWindow(row.values[dateIndex])) continue;
      const id = row.values[0];
      if (!target.has(id)) target.set(id, []);
      target.get(id).push({ ...row, archivo: file });
    }
  }
  return clean['estudiantes.csv'].map(({ values: [id, group, program] }) => {
    const sessions = attendance.get(id) || [];
    const grades = [...(evaluations.get(id) || [])].sort((a, b) => a.values[2].localeCompare(b.values[2]) || a.values[1].localeCompare(b.values[1]));
    const activities = submissions.get(id) || [];
    const marks = grades.map((row) => Number(row.values[3]));
    const missing = [];
    if (sessions.length < minSessions) missing.push(`Se requieren ${minSessions} sesiones; hay ${sessions.length}.`);
    if (grades.length < minEvaluations) missing.push(`Se requieren ${minEvaluations} evaluaciones; hay ${grades.length}.`);
    const warnings = [];
    if (!activities.length) warnings.push('Sin actividades vencidas en el periodo seleccionado.');
    if (marks.length < 3) warnings.push('No hay historial anterior para calcular la tendencia.');
    return {
      id, group, program,
      indicators: {
        attendance: sessions.length ? sessions.reduce((sum, row) => sum + Number(row.values[2]), 0) / sessions.length * 100 : null,
        average: mean(marks),
        submissions: activities.length ? activities.reduce((sum, row) => sum + Number(row.values[3]), 0) / activities.length * 100 : null,
        trend: marks.length >= 3 ? mean(marks.slice(-2)) - mean(marks.slice(0, -2)) : null,
      },
      counts: { sessions: sessions.length, evaluations: grades.length, dueActivities: activities.length },
      sufficient: missing.length === 0, missing, warnings,
      sources: { attendance: sessions, evaluations: grades, submissions: activities },
      window: { start, end: cutoff },
    };
  });
}
