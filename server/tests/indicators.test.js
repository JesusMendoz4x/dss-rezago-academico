import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { extract } from '../src/services/etl/pipeline.js';
import { transformSources } from '../src/services/etl/transform.js';
import { buildStudentProfiles } from '../src/services/indicators/students.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const spec = JSON.parse(await readFile(path.join(root, 'data/dataset-spec.json'), 'utf8'));
const expected = JSON.parse(await readFile(path.join(root, 'data/reference/expected-indicators.json'), 'utf8'));
const { sources } = await extract(path.join(root, 'data/raw'), spec);
const { clean } = transformSources(sources, spec);
const full = buildStudentProfiles(clean, { cutoff: spec.fecha_corte });

test('Los 30 estudiantes reproducen los indicadores de referencia', () => {
  assert.equal(full.length, expected.length);
  for (const e of expected) {
    const actual = full.find((student) => student.id === e.id_estudiante);
    for (const [field, reference] of [['attendance', 'asistencia'], ['average', 'promedio'], ['submissions', 'entregas'], ['trend', 'tendencia']]) {
      if (e[reference] === null) assert.equal(actual.indicators[field], null);
      else assert(Math.abs(actual.indicators[field] - e[reference]) < 1e-9);
    }
    assert.equal(actual.sufficient, e.sesiones >= 4 && e.evaluaciones >= 2);
    assert.equal(actual.counts.sessions, e.sesiones);
    assert.equal(actual.counts.evaluations, e.evaluaciones);
    assert.equal(actual.counts.dueActivities, e.actividades_vencidas);
  }
});

test('E-0007 calcula 72 %, 6.5, 60 % y tendencia -1 con procedencia', () => {
  const profile = full.find((s) => s.id === 'E-0007');
  assert.deepEqual(profile.indicators, { attendance: 72, average: 6.5, submissions: 60, trend: -1 });
  assert(profile.sources.attendance.every((row) => row.archivo === 'asistencia.csv' && row.fila > 1));
});

test('Faltantes no se convierten en cero ni se eliminan del catálogo', () => {
  assert.equal(full.find((s) => s.id === 'E-0003').indicators.attendance, null);
  assert.equal(full.find((s) => s.id === 'E-0006').indicators.average, null);
  assert.equal(full.find((s) => s.id === 'E-0004').sufficient, false);
  assert.equal(full.find((s) => s.id === 'E-0009').indicators.trend, null);
});

test('Actividades futuras se excluyen y se informa la limitación', () => {
  const profile = full.find((s) => s.id === 'E-0005');
  assert.equal(profile.indicators.submissions, null);
  assert.equal(profile.counts.dueActivities, 0);
  assert(profile.warnings.length > 0);
});

test('Ventana de 28 días filtra antes de calcular suficiencia e indicadores', () => {
  const short = buildStudentProfiles(clean, { cutoff: spec.fecha_corte, windowWeeks: 4 });
  const profile = short.find((s) => s.id === 'E-0007');
  assert.equal(profile.window.start, '2026-02-14');
  assert.equal(profile.counts.sessions, 15);
  assert.equal(profile.counts.evaluations, 2);
  assert.equal(profile.indicators.trend, null);
  assert.equal(profile.indicators.submissions, 20);
  assert.notEqual(profile.indicators.attendance, 72);
  assert.equal(short.find((s) => s.id === 'E-0004').sufficient, false);
  assert.throws(() => buildStudentProfiles(clean, { cutoff: spec.fecha_corte, windowWeeks: 2 }));
});
