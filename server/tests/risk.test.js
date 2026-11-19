import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { extract } from '../src/services/etl/pipeline.js';
import { transformSources } from '../src/services/etl/transform.js';
import { buildStudentProfiles } from '../src/services/indicators/students.js';
import { evaluateProfile, prioritize, validateScenario } from '../src/services/decision/risk.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const configs = JSON.parse(await readFile(path.join(root, 'server/config/scenarios.json'), 'utf8'));
const base = configs.find((c) => c.id === 'base');
const spec = JSON.parse(await readFile(path.join(root, 'data/dataset-spec.json'), 'utf8'));
const expected = JSON.parse(await readFile(path.join(root, 'data/reference/expected-indicators.json'), 'utf8'));
const { sources } = await extract(path.join(root, 'data/raw'), spec);
const { clean } = transformSources(sources, spec);
const profiles = buildStudentProfiles(clean, { cutoff: spec.fecha_corte });
const student = (id) => profiles.find((p) => p.id === id);

test('Ejemplo manual: 66.75, alto y mixto', () => {
  const result = evaluateProfile(student('E-0007'), base);
  assert.equal(result.index, 66.75);
  assert.equal(result.level, 'alto');
  assert.equal(result.riskType, 'mixto');
  assert.equal(result.components.reduce((s, p) => s + p.contribution, 0), result.index);
});

test('Todos los índices reproducen el oráculo independiente', () => {
  for (const e of expected) {
    const result = evaluateProfile(student(e.id_estudiante), base);
    if (e.indice_base === null) assert.equal(result.index, null);
    else assert(Math.abs(result.index - e.indice_base) < 1e-9);
    assert.equal(result.level, e.nivel);
  }
});

test('Sin datos suficientes no hay dictamen ni prioridad numérica', () => {
  const ranked = prioritize(profiles, base);
  for (const id of ['E-0003', 'E-0004', 'E-0006', 'E-0008']) {
    const result = ranked.find((p) => p.id === id);
    assert.equal(result.level, 'sin_dictamen');
    assert.equal(result.position, null);
    assert.equal(result.index, null);
  }
  assert.equal(ranked.at(-1).level, 'sin_dictamen');
});

test('Componentes ausentes se excluyen y los pesos efectivos suman uno', () => {
  for (const id of ['E-0005', 'E-0009']) {
    const result = evaluateProfile(student(id), base);
    assert(result.warnings.some((w) => w.includes('renormalizados')));
    assert(Math.abs(result.components.reduce((s, p) => s + p.effectiveWeight, 0) - 1) < 1e-9);
    assert(!result.components.some((p) => p.value === null));
  }
});

test('Umbrales exactos 60 y 30 y ausencia total de riesgo', () => {
  const p = { ...student('E-0007'), indicators: { attendance: 60, average: 8, submissions: 90, trend: 0 } };
  let config = { ...base, pesos: { asistencia: .6, desempeno: .4, entregas: 0, tendencia: 0 } };
  assert.equal(evaluateProfile(p, config).level, 'alto');
  config = { ...base, pesos: { asistencia: .3, desempeno: .7, entregas: 0, tendencia: 0 } };
  assert.equal(evaluateProfile(p, config).level, 'medio');
  assert.equal(evaluateProfile(student('E-0001'), base).index, 0);
});

test('Configuraciones inválidas no producen recomendaciones', () => {
  assert.throws(() => validateScenario({ ...base, pesos: { ...base.pesos, asistencia: 1 } }));
  assert.throws(() => validateScenario({ ...base, umbrales: { medio: 70, alto: 60 } }));
  assert.throws(() => validateScenario({ ...base, minimos: { sesiones: 0, evaluaciones: 2 } }));
  assert.throws(() => validateScenario({ ...base, ventanaSemanas: 2 }));
});

test('Cambiar pesos modifica índices y puede invertir prioridades', () => {
  const standard = prioritize(profiles, base);
  const alternate = prioritize(profiles, configs.find((c) => c.id === 'asistencia'));
  assert(standard.some((s) => s.index !== alternate.find((a) => a.id === s.id).index));
  const template = student('E-0007');
  const opposite = [
    { ...template, id: 'E-9001', indicators: { attendance: 60, average: 8, submissions: 90, trend: 0 } },
    { ...template, id: 'E-9002', indicators: { attendance: 90, average: 6, submissions: 90, trend: 0 } },
  ];
  assert.equal(prioritize(opposite, base)[0].id, 'E-9002');
  assert.equal(prioritize(opposite, configs.find((c) => c.id === 'asistencia'))[0].id, 'E-9001');
  const sensitive = prioritize(profiles, configs.find((c) => c.id === 'sensible'));
  assert(sensitive.filter((p) => p.level === 'alto').length >= standard.filter((p) => p.level === 'alto').length);
});

test('Ventana corta recalcula suficiencia y no muta perfiles ni configuración', () => {
  const snapshot = JSON.stringify({ profiles, base });
  prioritize(profiles, base);
  assert.equal(JSON.stringify({ profiles, base }), snapshot);
  const shortConfig = configs.find((c) => c.id === 'ventana-corta');
  const short = buildStudentProfiles(clean, { cutoff: spec.fecha_corte, windowWeeks: shortConfig.ventanaSemanas });
  const result = evaluateProfile(short.find((p) => p.id === 'E-0007'), shortConfig);
  assert(!result.components.some((p) => p.name === 'tendencia'));
});
