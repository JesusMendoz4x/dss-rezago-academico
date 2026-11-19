import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAttentionPlan, parseCapacity } from '../src/utils/attention-plan.js';

const students = [
  { id: 'E-0004', level: 'sin_dictamen', index: null },
  { id: 'E-0002', level: 'alto', index: 80 },
  { id: 'E-0003', level: 'medio', index: 45 },
  { id: 'E-0001', level: 'alto', index: 80 },
  { id: 'E-0005', level: 'bajo', index: 10 },
];

test('Selecciona por índice y desempata por código sin mutar la lista', () => {
  const before = JSON.stringify(students);
  const plan = buildAttentionPlan(students, 2);
  assert.deepEqual(plan.selectedIds, ['E-0001', 'E-0002']);
  assert.equal(plan.pending, 1);
  assert.equal(plan.statuses.get('E-0003'), 'pending');
  assert.equal(plan.statuses.get('E-0004'), 'complete_data');
  assert.equal(plan.statuses.get('E-0005'), 'monitoring');
  assert.equal(JSON.stringify(students), before);
});

test('Capacidad cero mantiene todos los casos elegibles pendientes', () => {
  const plan = buildAttentionPlan(students, 0);
  assert.equal(plan.scheduled, 0);
  assert.equal(plan.pending, 3);
  assert.equal(plan.statuses.size, students.length);
});

test('Capacidad mayor que la demanda no selecciona monitoreo ni datos insuficientes', () => {
  const plan = buildAttentionPlan(students, 10);
  assert.equal(plan.scheduled, 3);
  assert.equal(plan.pending, 0);
  assert.equal(plan.available, 7);
  assert.equal(plan.statuses.size, 5);
});

test('Lista vacía y capacidades inválidas', () => {
  assert.equal(buildAttentionPlan([], 5).scheduled, 0);
  for (const value of [-1, 1.5, NaN, Infinity, '5']) assert.throws(() => buildAttentionPlan(students, value));
});

test('Entrada del formulario no convierte vacío o decimales en capacidad válida', () => {
  assert.equal(parseCapacity('0'), 0);
  assert.equal(parseCapacity(' 5 '), 5);
  for (const value of ['', ' ', '-1', '1.5', '1e2', 'hola', '99999999999999999999999']) assert.throws(() => parseCapacity(value));
});
