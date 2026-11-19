export async function getScenarios(signal) {
  const response = await fetch('/api/scenarios', { signal });
  if (!response.ok) throw new Error('No se pudieron cargar los escenarios. Verifica que la API est? en ejecuci?n.');
  const payload = await response.json();
  return payload.data;
}
