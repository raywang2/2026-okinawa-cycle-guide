import test from 'node:test';
import assert from 'node:assert/strict';
import { elevationRange } from '../assets/elevation-range.js';

const profile = { sourceDistanceKm: 4, points: [[0, 100], [1, 200], [2, 100], [3, 150], [4, 100]] };

test('counts climbs and descents even when endpoints have the same height', () => {
  assert.deepEqual(elevationRange(profile, 4, 0, 4), { ascentM: 150, descentM: 150 });
});
test('clips both endpoints and maps displayed kilometres to profile distances', () => {
  assert.deepEqual(elevationRange(profile, 8, 1, 5), { ascentM: 75, descentM: 100 });
});
test('reverse dragging selects the same route-direction totals', () => {
  assert.deepEqual(elevationRange(profile, 8, 5, 1), { ascentM: 75, descentM: 100 });
});
test('flat, empty, and descending ranges', () => {
  assert.deepEqual(elevationRange(profile, 4, 1, 1), { ascentM: 0, descentM: 0 });
  assert.deepEqual(elevationRange(profile, 4, 1, 2), { ascentM: 0, descentM: 100 });
  assert.deepEqual(elevationRange({ sourceDistanceKm: 1, points: [[0, 20], [1, 20]] }, 1, 0, 1), { ascentM: 0, descentM: 0 });
});
