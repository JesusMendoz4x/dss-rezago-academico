import { Router } from 'express';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { extract } from '../../services/etl/pipeline.js';
import { transformSources } from '../../services/etl/transform.js';
import { buildStudentProfiles } from '../../services/indicators/students.js';
import { prioritize, validateScenario } from '../../services/decision/risk.js';
import { compareResults } from '../../services/decision/compare.js';

export const recommendationsRouter = Router();
const root = fileURLToPath(new URL('../../../../', import.meta.url));
async function readScenarios() {
  return JSON.parse(await readFile(path.join(root, 'server/config/scenarios.json'), 'utf8'));
}
async function snapshot() {
  const spec = JSON.parse(await readFile(path.join(root, 'data/dataset-spec.json'), 'utf8'));
  const { sources, manifest } = await extract(path.join(root, 'data/raw'), spec);
  const { clean } = transformSources(sources, spec);
  return { spec, manifest, clean };
}
function calculate({ spec, clean }, config) {
  validateScenario(config);
  const profiles = buildStudentProfiles(clean, { cutoff: spec.fecha_corte, windowWeeks: config.ventanaSemanas, minSessions: config.minimos.sesiones, minEvaluations: config.minimos.evaluaciones });
  return prioritize(profiles, config);
}
function missingSources(error, res) {
  if (error.code === 'ENOENT') return res.status(404).json({ error: { code: 'SOURCES_MISSING', message: 'Faltan fuentes para calcular la priorización.' } });
  throw error;
}
recommendationsRouter.get('/compare', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const configs = await readScenarios();
    const left = configs.find((item) => item.id === (req.query.left ?? 'base'));
    const right = configs.find((item) => item.id === (req.query.right ?? 'asistencia'));
    if (!left || !right) return res.status(400).json({ error: { code: 'INVALID_SCENARIO', message: 'Uno de los escenarios es desconocido.' } });
    const data = await snapshot();
    const students = compareResults(calculate(data, left), calculate(data, right));
    res.json({ data: { left, right, students, manifest: data.manifest, mode: 'validated_sources' } });
  } catch (error) { return missingSources(error, res); }
});
recommendationsRouter.get('/', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const configs = await readScenarios();
    const config = configs.find((item) => item.id === (req.query.scenario ?? 'base'));
    if (!config) return res.status(400).json({ error: { code: 'INVALID_SCENARIO', message: 'Escenario desconocido.' } });
    const data = await snapshot();
    res.json({ data: { scenario: config, manifest: data.manifest, students: calculate(data, config), mode: 'validated_sources' } });
  } catch (error) { return missingSources(error, res); }
});
