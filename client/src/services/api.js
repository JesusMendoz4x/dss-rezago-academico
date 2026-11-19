async function get(path, signal, fallback) {
  const response = await fetch(path, { signal });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message || fallback);
  }
  const payload = await response.json();
  return payload.data;
}

export function getScenarios(signal) {
  return get('/api/scenarios', signal, 'No se pudieron cargar los escenarios. Verifica que la API esté en ejecución.');
}

export function getQuality(signal) {
  return get('/api/quality', signal, 'No se pudo validar la calidad de los datos. Verifica que la API esté en ejecución.');
}

export function getStudents(window, signal) {
  return get(`/api/students?window=${encodeURIComponent(window)}`, signal, 'No se pudieron consultar los estudiantes. Verifica que la API esté en ejecución.');
}

export function getRecommendations(scenario, signal) {
  return get(`/api/recommendations?scenario=${encodeURIComponent(scenario)}`, signal, 'No se pudo calcular la priorización. Verifica que la API esté en ejecución.');
}

export function getComparison(left, right, signal) {
  return get(`/api/recommendations/compare?left=${encodeURIComponent(left)}&right=${encodeURIComponent(right)}`, signal, 'No se pudieron comparar los escenarios. Verifica que la API esté en ejecución.');
}
