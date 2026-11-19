import test from 'node:test';
import assert from 'node:assert/strict';
import { compareResults } from '../src/services/decision/compare.js';

const row = (index, level = 'medio', position = 5) => ({ id: 'E-0001', group: 'ISC-1A', index, level, position, action: 'Seguimiento' });

test('Mismo resultado no genera cambios', () => {
  const [result] = compareResults([row(40)], [row(40)]);
  assert.equal(result.changed, false);
  assert.equal(result.delta, 0);
  assert.equal(result.positionChange, 0);
});

test('Variación es B menos A y subida es posición A menos B', () => {
  const [result] = compareResults([row(40)], [row(65, 'alto', 2)]);
  assert.equal(result.delta, 25);
  assert.equal(result.positionChange, 3);
  assert.equal(result.levelChanged, true);
  assert.equal(result.changed, true);
});

test('Sin dictamen no equivale a cero; las transiciones sí cuentan como cambio', () => {
  const none = row(null, 'sin_dictamen', null);
  const [same] = compareResults([none], [none]);
  assert.equal(same.delta, null);
  assert.equal(same.positionChange, null);
  assert.equal(same.changed, false);
  const [transition] = compareResults([none], [row(20, 'bajo', 10)]);
  assert.equal(transition.changed, true);
  assert.equal(transition.delta, null);
});

test('Catálogos distintos o duplicados se rechazan; no se mutan entradas', () => {
  const a = [row(40)]; const b = [row(60)];
  const before = JSON.stringify({ a, b });
  compareResults(a, b);
  assert.equal(JSON.stringify({ a, b }), before);
  assert.throws(() => compareResults(a, []));
  assert.throws(() => compareResults(a, [{ ...b[0], id: 'E-0002' }]));
  assert.throws(() => compareResults([a[0], a[0]], [b[0], { ...b[0], id: 'E-0002' }]));
});
