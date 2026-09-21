import fs from 'node:fs';
import assert from 'node:assert/strict';

const routes = JSON.parse(fs.readFileSync('public/data/routes.json', 'utf8'));
const days = process.argv.slice(2).map(Number);
assert(days.length && days.every(day => Number.isInteger(day) && day >= 1 && day <= 5), 'Usage: node scripts/export-gpx.mjs 1 2 3 4 5');
// Confirmed lodging markers. Keep these separate from the My Maps road track.
const stays = {
  1: { name: 'Comfort Villa', lat: 26.677368142125, lon: 127.88905893304 },
  2: { name: 'Yanbaru Hostel', lat: 26.7443506, lon: 128.1770822 },
  3: { name: 'ASBO STAY HOTEL', lat: 26.4598025, lon: 127.9455834 },
  4: { name: 'Unwind DAY OFF Nagamo', lat: 26.1288743, lon: 127.7549188 },
  5: { name: 'コンフォートホテル那覇県庁前', lat: 26.2134511, lon: 127.6776457 }
};
const xml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
for (const day of days) {
  const route = routes.find(route => route.day === day);
  assert(route?.geojson?.type === 'LineString');
  const points = route.geojson.coordinates;
  assert(points.length > 1 && points.every(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat)));
  const start = day === 1 ? '那霸' : stays[day - 1].name;
  const title = `Day ${day}｜10/${day + 10}｜${start} → ${stays[day].name}`;
  const description = `${route.generatedDistanceKm} km；軌跡依 Google My Maps，住宿定位點獨立標示。`;
  const waypoints = [
    ...(day > 1 ? [stays[day - 1]] : [{ name: '那霸出發點', lon: points[0][0], lat: points[0][1] }]),
    stays[day]
  ];
  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="2026-routes" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${xml(title)}</name><desc>${xml(description)}</desc></metadata>
${waypoints.map(point => `  <wpt lat="${point.lat}" lon="${point.lon}"><name>${xml(point.name)}</name></wpt>`).join('\n')}
  <trk><name>${xml(title)}</name><trkseg>
${points.map(([lon, lat]) => `    <trkpt lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}"></trkpt>`).join('\n')}
  </trkseg></trk>
</gpx>
`;
  for (const file of [`public/routes/generated/day-${String(day).padStart(2, '0')}.gpx`, `routes/day${day}.gpx`]) {
    fs.writeFileSync(file, gpx);
  }
  console.log(`${title}: ${points.length} track points; ${route.generatedDistanceKm} km`);
}
