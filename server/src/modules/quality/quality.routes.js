import { Router } from 'express';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { extract } from '../../services/etl/pipeline.js';
import { transformSources } from '../../services/etl/transform.js';

export const qualityRouter = Router();
const root = fileURLToPath(new URL('../../../../', import.meta.url));

// Lectura y transformación únicamente: no publica evidencias ni carga MySQL.
qualityRouter.get('/', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const spec = JSON.parse(await readFile(path.join(root, 'data/dataset-spec.json'), 'utf8'));
    const { sources, manifest } = await extract(path.join(root, 'data/raw'), spec);
    const { report, anomalies } = transformSources(sources, spec);
    res.json({ data: { mode: 'validation', manifest, report, anomalies } });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: { code: 'SOURCES_MISSING', message: 'Faltan archivos de entrada para validar los datos.' } });
    }
    throw error;
  }
});
