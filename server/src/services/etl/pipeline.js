import { readFile, mkdir, writeFile, rename, rm } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { HEADERS, transformSources } from './transform.js';
import { encodeCsv } from './csv.js';

export async function extract(inputDir, spec) {
  const sources = {}, hashes = {};
  for (const name of Object.keys(HEADERS)) {
    const bytes = await readFile(path.join(inputDir, name));
    hashes[name] = createHash('sha256').update(bytes).digest('hex');
    sources[name] = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  }
  // Solo parámetros que afectan al ETL; la receta de anomalías no interviene.
  const configuration = {
    version_etl: '1.0.0', datos_ficticios: spec.datos_ficticios,
    periodo_inicio: spec.periodo_inicio, periodo_fin: spec.periodo_fin,
    fecha_corte: spec.fecha_corte, grupos: spec.grupos,
  };
  const fingerprint = createHash('sha256').update(JSON.stringify({ configuration, hashes })).digest('hex');
  return { sources, manifest: { fingerprint, configuration, archivos: hashes } };
}

/** Publica una carpeta completa. Repetir la entrada verifica, no duplica, la evidencia. */
export async function writeEvidence(result, manifest, outputDir) {
  await mkdir(outputDir, { recursive: true });
  const destination = path.join(outputDir, manifest.fingerprint);
  const artifacts = {
    'manifest.json': JSON.stringify(manifest, null, 2) + '\n',
    'quality-report.json': JSON.stringify(result.report, null, 2) + '\n',
    'provenance.json': JSON.stringify(result.clean, null, 2) + '\n',
    'rejected/records.json': JSON.stringify(result.rejected, null, 2) + '\n',
    'rejected/anomalies.csv': encodeCsv(
      ['archivo', 'fila', 'accion', 'campo', 'original', 'normalizado', 'motivo'],
      result.anomalies.map((a) => [a.archivo, a.fila, a.accion, a.campo, a.original, a.normalizado, a.motivo]),
    ),
  };
  for (const [name, header] of Object.entries(HEADERS)) {
    artifacts[`clean/${name}`] = encodeCsv(header, result.clean[name].map((row) => row.values));
  }
  try {
    await readFile(path.join(destination, 'manifest.json'));
    for (const [name, expected] of Object.entries(artifacts)) {
      if (await readFile(path.join(destination, name), 'utf8') !== expected) {
        throw new Error(`Evidencia existente alterada: ${name}`);
      }
    }
    return destination;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const staging = path.join(outputDir, `.tmp-${randomUUID()}`);
  try {
    for (const [name, content] of Object.entries(artifacts)) {
      const target = path.join(staging, name);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, content, 'utf8');
    }
    await rename(staging, destination);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
  return destination;
}
