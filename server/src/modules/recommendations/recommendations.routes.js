import { Router } from 'express';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { extract } from '../../services/etl/pipeline.js';
import { transformSources } from '../../services/etl/transform.js';
import { buildStudentProfiles } from '../../services/indicators/students.js';
import { prioritize, validateScenario } from '../../services/decision/risk.js';

export const recommendationsRouter = Router();
const root = fileURLToPath(new URL('../../../../', import.meta.url));
recommendationsRouter.get('/', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const scenarios = JSON.parse(await readFile(path.join(root, 'server/config/scenarios.json'), 'utf8'));
    const config = scenarios.find((item) => item.id === (req.query.scenario ?? 'base'));
    if (!config) return res.status(400).json({ error: { code: 'INVALID_SCENARIO', message: 'Escenario desconocido.' } });
    validateScenario(config);
    const spec = JSON.parse(await readFile(path.join(root, 'data/dataset-spec.json'), 'utf8'));
    const { sources, manifest } = await extract(path.join(root, 'data/raw'), spec);
    const { clean } = transformSources(sources, spec);
    const profiles = buildStudentProfiles(clean, { cutoff: spec.fecha_corte, windowWeeks: config.ventanaSemanas, minSessions: config.minimos.sesiones, minEvaluations: config.minimos.evaluaciones });
    res.json({ data: { scenario: config, manifest, students: prioritize(profiles, config), mode: 'validated_sources' } });
  } catch (error) {
    if (error.code === 'ENOENT') return res.status(404).json({ error: { code: 'SOURCES_MISSING', message: 'Faltan fuentes para calcular la priorización.' } });
    throw error;
  }
});
