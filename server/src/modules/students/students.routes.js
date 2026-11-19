import { Router } from 'express';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { extract } from '../../services/etl/pipeline.js';
import { transformSources } from '../../services/etl/transform.js';
import { buildStudentProfiles } from '../../services/indicators/students.js';

export const studentsRouter = Router();
const root = fileURLToPath(new URL('../../../../', import.meta.url));
studentsRouter.get('/', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const window = req.query.window ?? 'all';
  if (!['all', '4'].includes(window)) {
    return res.status(400).json({ error: { code: 'INVALID_WINDOW', message: 'El periodo debe ser all o 4.' } });
  }
  try {
    const spec = JSON.parse(await readFile(path.join(root, 'data/dataset-spec.json'), 'utf8'));
    const configs = JSON.parse(await readFile(path.join(root, 'server/config/scenarios.json'), 'utf8'));
    const base = configs.find((item) => item.id === 'base');
    if (!base) throw new Error('Falta configuración base');
    const { sources, manifest } = await extract(path.join(root, 'data/raw'), spec);
    const { clean } = transformSources(sources, spec);
    const students = buildStudentProfiles(clean, {
      cutoff: spec.fecha_corte, windowWeeks: window === '4' ? 4 : null,
      minSessions: base.minimos.sesiones, minEvaluations: base.minimos.evaluaciones,
    });
    res.json({ data: { students, manifest, mode: 'validated_sources' } });
  } catch (error) {
    if (error.code === 'ENOENT') return res.status(404).json({ error: { code: 'SOURCES_MISSING', message: 'Faltan archivos para consultar estudiantes.' } });
    throw error;
  }
});
