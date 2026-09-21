import fs from 'node:fs';
import assert from 'node:assert/strict';

const days = process.argv.slice(2).map(Number);
assert(days.length && days.every(day => Number.isInteger(day) && day > 0 && day <= 5), 'Usage: node scripts/update-elevation.mjs 1 2');
const file = 'public/data/routes.json';
const routes = JSON.parse(fs.readFileSync(file, 'utf8'));
const rad = n => n * Math.PI / 180;
function distance(a, b) {
  const h = Math.sin(rad(b[1] - a[1]) / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(rad(b[0] - a[0]) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
for (const day of days) {
  const route = routes.find(route => route.day === day);
  assert(route?.geojson?.type === 'LineString');
  const coordinates = route.geojson.coordinates;
  const via = [coordinates[0]];
  let sinceLast = 0;
  for (let i = 1; i < coordinates.length - 1; i++) {
    sinceLast += distance(coordinates[i - 1], coordinates[i]);
    if (sinceLast >= 4) { via.push(coordinates[i]); sinceLast = 0; }
  }
  via.push(coordinates.at(-1));
  const params = new URLSearchParams({ lonlats: via.map(p => p.slice(0, 2).join(',')).join('|'), profile: 'trekking', alternativeidx: '0', format: 'geojson' });
  console.log(`Day ${day}: fetching BRouter elevation through ${via.length} waypoints`);
  const response = await fetch(`https://brouter.de/brouter?${params}`, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw Error(`BRouter ${response.status}: ${await response.text()}`);
  const result = await response.json();
  const feature = result.features.find(feature => feature.geometry?.type === 'LineString');
  assert(feature, 'Missing BRouter route');
  const track = feature.geometry.coordinates;
  assert(track.length > 1 && track.every(p => Number.isFinite(p[2])), 'Missing elevation data');
  const points = [[0, track[0][2]]];
  let km = 0;
  for (let i = 1; i < track.length; i++) {
    km += distance(track[i - 1], track[i]);
    if (km - points.at(-1)[0] >= 0.2 || i === track.length - 1) {
      if (km > points.at(-1)[0]) points.push([km, track[i][2]]);
    }
  }
  const ascentM = Number(feature.properties['filtered ascend'] ?? feature.properties['filtered-ascend'] ?? feature.properties['plain-ascend']);
  assert(Number.isFinite(ascentM) && ascentM >= 0, `Missing ascent: ${JSON.stringify(feature.properties)}`);
  assert(km > route.generatedDistanceKm * 0.7 && km < route.generatedDistanceKm * 1.5, 'BRouter route distance differs too far from My Maps');
  route.elevationProfile = { source: 'BRouter', profile: 'trekking', ascentM, sourceDistanceKm: km, points };
  console.log(`Day ${day}: ${km.toFixed(1)} km estimated route, ${ascentM} m ascent, ${points.length} elevation samples`);
}
// Write only when every requested day has a validated profile.
fs.writeFileSync(file, JSON.stringify(routes, null, 2) + '\n');
