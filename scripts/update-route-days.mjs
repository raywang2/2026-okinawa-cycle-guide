// Update selected website routes from a downloaded My Maps KML without rebuilding other days.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { XMLParser } from 'fast-xml-parser';

const [source, ...requestedDays] = process.argv.slice(2);
assert(source && requestedDays.length, 'Usage: node scripts/update-route-days.mjs source.kml 1 2 3');
const days = requestedDays.map(Number);
assert(days.every(day => Number.isInteger(day) && day >= 1 && day <= 5));
const kml = fs.readFileSync(source, 'utf8');
const segments = new Map();
function walk(value) {
  if (!value || typeof value !== 'object') return;
  if (value.LineString) {
    const match = value.name?.match(/^第([一二三四五])天路線/);
    if (match) {
      const day = '一二三四五'.indexOf(match[1]) + 1;
      assert(!segments.has(day), `Duplicate route for day ${day}`);
      const coordinates = value.LineString.coordinates.trim().split(/\s+/).map(token => token.split(',').slice(0, 2).map(Number));
      assert(coordinates.length >= 2 && coordinates.every(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat) && Math.abs(lon) <= 180 && Math.abs(lat) <= 90));
      segments.set(day, { name: value.name, coordinates });
    }
  }
  for (const child of Object.values(value)) if (typeof child === 'object') Array.isArray(child) ? child.forEach(walk) : walk(child);
}
walk(new XMLParser().parse(kml));
const rad = value => value * Math.PI / 180;
function distance(a, b) {
  const h = Math.sin(rad(b[1] - a[1]) / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(rad(b[0] - a[0]) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
const round = value => Math.round(value * 10) / 10;
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const routes = JSON.parse(fs.readFileSync('public/data/routes.json', 'utf8'));
const files = [];
for (const day of days) {
  const route = routes.find(route => route.day === day);
  const segment = segments.get(day);
  assert(route && segment, `Missing day ${day}`);
  const { coordinates, name } = segment;
  if (JSON.stringify(route.geojson.coordinates) === JSON.stringify(coordinates)) {
    console.log(`Day ${day}: unchanged (${route.generatedDistanceKm} km)`);
    continue;
  }
  const progress = [0];
  coordinates.slice(1).forEach((point, i) => progress.push(progress[i] + distance(coordinates[i], point)));
  const km = round(progress.at(-1));
  // Reproject existing stops onto the new geometry; omit stops over 1.2 km away.
  route.convenienceStores = route.convenienceStores.flatMap(store => {
    const scale = Math.cos(rad(store.lat));
    let best = { offset: Infinity };
    for (let i = 1; i < coordinates.length; i++) {
      const a = coordinates[i - 1], b = coordinates[i];
      const dx = (b[0] - a[0]) * scale, dy = b[1] - a[1];
      const sx = (store.lon - a[0]) * scale, sy = store.lat - a[1];
      const t = Math.max(0, Math.min(1, (sx * dx + sy * dy) / (dx * dx + dy * dy || 1)));
      const point = [a[0] + (b[0] - a[0]) * t, a[1] + dy * t];
      const offset = distance(point, [store.lon, store.lat]) * 1000;
      if (offset < best.offset) best = { offset, km: progress[i - 1] + t * (progress[i] - progress[i - 1]), side: dx * sy - dy * sx > 0 ? 'left' : 'right' };
    }
    return best.offset > 1200 ? [] : [{ ...store, distanceFromRouteM: Math.round(best.offset), routeProgressKm: round(best.km), targetKm: Math.round(best.km / 10) * 10, sideOfRoute: best.offset < 5 ? 'on-route' : best.side }];
  }).sort((a, b) => a.routeProgressKm - b.routeProgressKm);
  console.log(`Day ${day}: ${route.generatedDistanceKm} → ${km} km; ${route.convenienceStores.length} retained stops`);
  Object.assign(route, { title: name, description: name, distanceKm: km, generatedDistanceKm: km, distanceDeltaKm: 0, distanceWarning: null, geojson: { type: 'LineString', coordinates }, elevationProfile: null });
  route.waypoints = [coordinates[0], coordinates.at(-1)].map(([lon, lat], i) => ({ name: `${name} ${i ? '終點' : '起點'}`, lat, lon }));
  route.start = route.waypoints[0].name;
  route.end = route.endAccommodation = route.waypoints[1].name;
  route.routeReview = { selectedCandidate: 'external-kml', reviewNote: null, candidates: [{ id: 'external-kml', label: 'Google My Maps KML', waypointNames: route.waypoints.map(point => point.name), generatedDistanceKm: km, distanceDeltaKm: 0, selected: true }] };
  const gpx = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="2026-routes" xmlns="http://www.topografix.com/GPX/1/1">\n  <metadata><name>${escape(name)}</name><desc>${escape(name)}</desc></metadata>\n  <trk><name>Day ${day} ${escape(name)}</name><trkseg>\n${coordinates.map(([lon, lat]) => `    <trkpt lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}"></trkpt>`).join('\n')}\n  </trkseg></trk>\n</gpx>\n`;
  files.push([`public/routes/generated/day-${String(day).padStart(2, '0')}.gpx`, gpx]);
}
// Keep the full downloaded source for audit; only selected days are applied to website data.
files.push(['public/data/mymaps-source.kml', kml], ['public/data/routes.json', JSON.stringify(routes, null, 2) + '\n']);
for (const [file, contents] of files) fs.writeFileSync(file, contents);
