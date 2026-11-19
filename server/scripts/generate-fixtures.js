/** Materializa los CSV sucios a partir de las referencias y anomal?as versionadas. */
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../../', import.meta.url));
const checkOnly = process.argv.includes('--check');
const spec = JSON.parse(await readFile(path.join(root, 'data/dataset-spec.json'), 'utf8'));
const names = ['estudiantes.csv', 'asistencia.csv', 'evaluaciones.csv', 'entregas.csv'];
const manifest = {
  version: spec.version,
  datos_ficticios: true,
  fecha_corte: spec.fecha_corte,
  archivos: {},
};

function encode(rows) {
  return rows.map((row) => row.map((value) => {
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }).join(',')).join('\n') + '\n';
}

for (const name of names) {
  const text = await readFile(path.join(root, 'data/reference', name), 'utf8');
  // Las referencias can?nicas no contienen comillas ni campos multil?nea.
  // Fallar expl?citamente si cambia ese contrato; no interpretar CSV arbitrario.
  assert(!text.includes('"'), 'Referencia con comillas: ampliar el lector antes de continuar');
  const [header, ...rows] = text.trimEnd().split(/\r?\n/).map((line) => line.split(','));
  assert(rows.every((row) => row.length === header.length), 'N?mero de columnas inv?lido');
  const referenceCount = rows.length;
  const anomalies = [];
  for (const operation of spec.anomalias.filter((item) => item.archivo === name)) {
    let index;
    if (operation.operacion === 'replace') {
      index = operation.indice;
      const field = header.indexOf(operation.campo);
      assert(field >= 0 && rows[index], 'Campo o fila de anomal?a inexistente');
      rows[index][field] = operation.valor;
    } else {
      assert.equal(operation.operacion, 'append');
      assert.equal(operation.fila.length, header.length);
      index = rows.length;
      rows.push([...operation.fila]);
    }
    anomalies.push({ id: operation.id, linea_csv: index + 2, esperado: operation.esperado });
  }
  const output = encode([header, ...rows]);
  const target = path.join(root, 'data/raw', name);
  if (checkOnly) assert.equal(await readFile(target, 'utf8'), output, `${name} no coincide con su receta`);
  else await writeFile(target, output, 'utf8');
  manifest.archivos[name] = {
    filas_referencia: referenceCount,
    filas_raw: rows.length,
    sha256: createHash('sha256').update(output).digest('hex'),
    anomalias: anomalies,
  };
}
const manifestPath = path.join(root, 'data/manifest.json');
if (checkOnly) assert.deepEqual(JSON.parse(await readFile(manifestPath, 'utf8')), manifest);
else await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(checkOnly ? 'CSV y manifiesto coinciden con la receta.' : 'CSV ficticios y manifiesto generados.');
