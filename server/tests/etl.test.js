import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv, encodeCsv } from '../src/services/etl/csv.js';
import { HEADERS, normalizeDate, transformSources } from '../src/services/etl/transform.js';
import { extract, writeEvidence } from '../src/services/etl/pipeline.js';
import { loadMysql } from '../src/repositories/etl.repository.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const spec = JSON.parse(await readFile(path.join(root, 'data/dataset-spec.json'), 'utf8'));
const { sources, manifest } = await extract(path.join(root, 'data/raw'), spec);

test('El ETL recupera las referencias sin leerlas durante la transformación', async () => {
  const result = transformSources(sources, spec);
  for (const name of Object.keys(HEADERS)) {
    const reference = parseCsv(await readFile(path.join(root, 'data/reference', name), 'utf8'));
    assert.deepEqual(result.clean[name].map((r) => r.values), reference.slice(1).map((r) => r.values));
  }
  assert.deepEqual(result.report.totales, { leidos: 1145, aceptados: 1134, corregidos: 5, rechazados: 10, duplicados: 1, conflictos: 0 });
  assert.equal(result.anomalies.length, 16);
  assert.equal(result.clean['entregas.csv'].filter((r) => r.values[0] === 'E-0005').length, 10);
  assert.equal(result.clean['estudiantes.csv'].length, 30);
  const fixture = JSON.parse(await readFile(path.join(root, 'data/manifest.json'), 'utf8'));
  for (const [name, entry] of Object.entries(fixture.archivos)) {
    for (const anomaly of entry.anomalias) {
      assert(result.anomalies.some((a) => a.archivo === name && a.fila === anomaly.linea_csv));
    }
  }
});

test('CSV con BOM, CRLF, comas, escapes y campos multilínea conserva filas de origen', () => {
  const rows = parseCsv('\uFEFFa,b\r\n"x,y","uno\r\ndos"\r\n"a""b",z\r\n');
  assert.deepEqual(rows.map((r) => r.values), [['a', 'b'], ['x,y', 'uno\ndos'], ['a"b', 'z']]);
  assert.equal(rows[2].line, 4);
  assert.deepEqual(parseCsv(encodeCsv(['a', 'b'], [['x,y', 'a"b']])).map((r) => r.values), [['a', 'b'], ['x,y', 'a"b']]);
  assert.throws(() => parseCsv('a\n"sin cierre'));
  assert.throws(() => parseCsv('a\n"x"basura'));
});

test('Fechas, límites y configuración inválida', () => {
  assert.equal(normalizeDate('12/03/26'), '2026-03-12');
  assert.equal(normalizeDate('29/02/24'), '2024-02-29');
  assert.throws(() => normalizeDate('2026-02-30'));
  assert.throws(() => transformSources(sources, { ...spec, fecha_corte: '2027-01-01' }));
  const boundary = { ...sources, 'evaluaciones.csv': sources['evaluaciones.csv'] + 'E-0001,MIN,2026-02-02,0\nE-0001,MAX,2026-03-13,10\n' };
  assert.equal(transformSources(boundary, spec).clean['evaluaciones.csv'].length, 113);
});

test('Encabezados incorrectos fallan y columnas incompletas quedan rechazadas', () => {
  assert.throws(() => transformSources({ ...sources, 'asistencia.csv': 'a,b\n1,2\n' }, spec));
  const changed = { ...sources, 'asistencia.csv': sources['asistencia.csv'] + 'E-0001,2026-03-10\n' };
  assert.equal(transformSources(changed, spec).report.archivos['asistencia.csv'].rechazados, 6);
});

test('Conflictos ponen todas las versiones en cuarentena y no pierden estudiantes sin datos', () => {
  const changed = { ...sources, 'asistencia.csv': sources['asistencia.csv'] + 'E-0001,2026-02-05,0\n' };
  const result = transformSources(changed, spec);
  assert.equal(result.report.archivos['asistencia.csv'].conflictos, 3);
  assert(!result.clean['asistencia.csv'].some((r) => r.values[0] === 'E-0001' && r.values[1] === '2026-02-05'));
  assert(result.clean['estudiantes.csv'].some((r) => r.values[0] === 'E-0003'));
  for (const stats of Object.values(result.report.archivos)) {
    assert.equal(stats.leidos, stats.aceptados + stats.rechazados + stats.duplicados + stats.conflictos);
    assert(stats.corregidos <= stats.aceptados);
  }
});

test('Catálogo contradictorio invalida también sus referencias', () => {
  const changed = { ...sources, 'estudiantes.csv': sources['estudiantes.csv'] + 'E-0001,ISC-2A,Otro programa\n' };
  const result = transformSources(changed, spec);
  assert.equal(result.report.archivos['estudiantes.csv'].conflictos, 2);
  assert(!result.clean['asistencia.csv'].some((r) => r.values[0] === 'E-0001'));
});

test('Evidencias reproducibles y modificación de archivos detectada', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'dss-etl-'));
  try {
    const result = transformSources(sources, spec);
    const first = await writeEvidence(result, manifest, directory);
    assert.equal(await writeEvidence(result, manifest, directory), first);
    const report = JSON.parse(await readFile(path.join(first, 'quality-report.json'), 'utf8'));
    assert.deepEqual(report, result.report);
    await writeFile(path.join(first, 'quality-report.json'), '{}\n');
    await assert.rejects(() => writeEvidence(result, manifest, directory), /alterada/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

function fakePool({ fail = false, existing = false } = {}) {
  const calls = [];
  const connection = {
    query: async (sql) => { calls.push(sql); return [[{ acquired: 1 }]]; },
    beginTransaction: async () => { calls.push('begin'); },
    commit: async () => { calls.push('commit'); },
    rollback: async () => { calls.push('rollback'); },
    release: () => { calls.push('release'); },
    execute: async (sql) => {
      calls.push(sql);
      if (sql.startsWith('SELECT id')) return [existing ? [{ id: 42 }] : []];
      if (sql.startsWith('SELECT group_code')) return [[]];
      if (fail && sql.startsWith('INSERT INTO attendance')) throw new Error('Falla simulada');
      return [{ insertId: 42 }];
    },
  };
  return { calls, getConnection: async () => connection };
}

test('Carga confirma todo y reusa lotes sin duplicar', async () => {
  const result = transformSources(sources, spec);
  const pool = fakePool();
  assert.deepEqual(await loadMysql(pool, result, manifest), { batchId: 42, reused: false });
  assert(pool.calls.includes('commit'));
  assert(!pool.calls.includes('rollback'));
  const reused = fakePool({ existing: true });
  assert.equal((await loadMysql(reused, result, manifest)).reused, true);
  assert(!reused.calls.some((sql) => sql.startsWith('INSERT')));
});

test('Fallo de carga revierte y libera la conexión y el bloqueo', async () => {
  const pool = fakePool({ fail: true });
  await assert.rejects(() => loadMysql(pool, transformSources(sources, spec), manifest), /Falla simulada/);
  assert(pool.calls.includes('rollback'));
  assert(!pool.calls.includes('commit'));
  assert(pool.calls.some((sql) => sql.includes('RELEASE_LOCK')));
  assert.equal(pool.calls.at(-1), 'release');
});
