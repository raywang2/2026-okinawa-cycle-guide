// Map route distance to coordinates; elevation distances use the same displayed axis.
export function routeGeometry(route) {
  const lines = route.geojson?.type === 'MultiLineString' ? route.geojson.coordinates : [route.geojson?.coordinates || route.waypoints.map(p => [p.lon, p.lat])];
  const segments = [];
  let total = 0;
  const rad = n => n * Math.PI / 180;
  for (const line of lines) for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i];
    const h = Math.sin(rad(b[1] - a[1]) / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(rad(b[0] - a[0]) / 2) ** 2;
    const length = 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
    if (length) segments.push({ a, b, start: total, length, line });
    total += length;
  }
  const km = Number(route.generatedDistanceKm ?? route.distanceKm);
  const point = (s, t) => [s.a[1] + (s.b[1] - s.a[1]) * t, s.a[0] + (s.b[0] - s.a[0]) * t];
  function at(distance) {
    const target = Math.max(0, Math.min(km, distance)) / km * total;
    const s = segments.find(s => s.start + s.length >= target) || segments.at(-1);
    return s ? point(s, Math.max(0, Math.min(1, (target - s.start) / s.length))) : null;
  }
  function between(from, to) {
    const low = Math.min(from, to) / km * total, high = Math.max(from, to) / km * total;
    const parts = []; let previousLine;
    for (const s of segments) {
      if (s.start + s.length < low || s.start > high) continue;
      if (previousLine !== s.line) { parts.push([]); previousLine = s.line; }
      const part = parts.at(-1);
      part.push(point(s, Math.max(0, (low - s.start) / s.length)), point(s, Math.min(1, (high - s.start) / s.length)));
    }
    return parts;
  }
  function nearest(latlng, project) {
    const target = project(latlng); let best = { pixels: Infinity, km: 0 };
    for (const s of segments) {
      const a = project({ lat: s.a[1], lng: s.a[0] }), b = project({ lat: s.b[1], lng: s.b[0] });
      const dx = b.x - a.x, dy = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((target.x - a.x) * dx + (target.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
      const pixels = Math.hypot(target.x - a.x - t * dx, target.y - a.y - t * dy);
      if (pixels < best.pixels) best = { pixels, km: (s.start + t * s.length) / total * km };
    }
    return best;
  }
  return { at, between, nearest };
}

export function linkRouteMap(map, route, L) {
  const geometry = routeGeometry(route), layer = L.layerGroup().addTo(map);
  const marker = L.circleMarker([0, 0], { radius: 8, color: '#fff', weight: 3, fillColor: '#d94816', fillOpacity: 1, interactive: false });
  const selection = L.polyline([], { color: '#d94816', weight: 9, opacity: .9, interactive: false }).addTo(layer);
  let profile;
  const visit = event => {
    const hit = geometry.nearest(event.latlng, p => map.latLngToContainerPoint(p));
    if (hit.pixels <= 20) profile?.show(hit.km);
  };
  map.on('mousemove click', visit);
  return {
    connect(api) { profile = api; },
    show(km, elevation) {
      const point = geometry.at(km); if (!point) return;
      marker.setLatLng(point).addTo(layer);
      marker.unbindTooltip().bindTooltip(`${km.toFixed(1)} km · ${Math.round(elevation)} m`, { permanent: true, direction: 'top' }).openTooltip();
    },
    select(from, to) { selection.setLatLngs(geometry.between(from, to)); },
    clear() { selection.setLatLngs([]); },
    hide() { layer.removeLayer(marker); },
    destroy() { map.off('mousemove click', visit); map.removeLayer(layer); }
  };
}
