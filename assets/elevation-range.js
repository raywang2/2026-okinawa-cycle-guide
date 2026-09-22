// Clip each linear profile segment to the selected distance before summing.
// Displayed route kilometres and source profile kilometres may differ.
export function elevationRange(profile, routeKm, fromKm, toKm) {
  const scale = profile.sourceDistanceKm / routeKm;
  const from = Math.max(0, Math.min(routeKm, Math.min(fromKm, toKm))) * scale;
  const to = Math.max(0, Math.min(routeKm, Math.max(fromKm, toKm))) * scale;
  let ascentM = 0, descentM = 0;
  for (let i = 1; i < profile.points.length; i++) {
    const [start, startHeight] = profile.points[i - 1];
    const [end, endHeight] = profile.points[i];
    const overlap = Math.min(to, end) - Math.max(from, start);
    if (end <= start || overlap <= 0) continue;
    const change = (endHeight - startHeight) * overlap / (end - start);
    if (change > 0) ascentM += change;
    else descentM -= change;
  }
  return { ascentM, descentM };
}
