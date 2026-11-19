import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { extract, writeEvidence } from '../src/services/etl/pipeline.js';
import { transformSources } from '../src/services/etl/transform.js';
import { loadMysql } from '../src/repositories/etl.repository.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const flags = process.argv.slice(2);
if (flags.some((flag) => !['--load', '--help'].includes(flag))) {
  console.error('Uso: node server/scripts/run-etl.js [--load]');
  process.exitCode = 1;
} else if (flags.includes('--help')) {
  console.log('Sin argumentos: CSV → limpieza → evidencias locales. --load: también cargar MySQL.');
} else {
  let pool;
  try {
    const spec = JSON.parse(await readFile(path.join(root, 'data/dataset-spec.json'), 'utf8'));
    const { sources, manifest } = await extract(path.join(root, 'data/raw'), spec);
    const result = transformSources(sources, spec);
    const evidence = await writeEvidence(result, manifest, path.join(root, 'data/etl-runs'));
    console.log('Reporte de calidad:', JSON.stringify(result.report, null, 2));
    console.log('Evidencia:', evidence);
    if (flags.includes('--load')) {
      // La configuración funciona tanto desde la raíz como desde el workspace server.
      const { default: dotenv } = await import('dotenv');
      dotenv.config({ path: path.join(root, 'server/.env') });
      ({ pool } = await import('../src/config/database.js'));
      const loaded = await loadMysql(pool, result, manifest);
      console.log(`MySQL: lote ${loaded.batchId}${loaded.reused ? ' ya existente, sin duplicar' : ' confirmado'}`);
    } else {
      console.log('Carga local completada. Usa npm run etl:load para cargar MySQL.');
    }
  } catch (error) {
    console.error('ETL falló:', error.message);
    process.exitCode = 1;
  } finally {
    if (pool) await pool.end();
  }
}
