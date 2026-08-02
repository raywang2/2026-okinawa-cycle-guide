import fs from "node:fs/promises";
import path from "node:path";

const MAP_ID = process.env.MYMAPS_ID || "1OctsgV_s5C_SEg3u5LY3jrjZcCwdugk";
const BUILDER_DIR = process.env.ROUTE_BUILDER_DIR || process.argv[2] || "../route-builder";
const KML_URL = `https://www.google.com/maps/d/kml?mid=${encodeURIComponent(MAP_ID)}&forcekml=1`;

type Point = { lat: number; lon: number };
type Segment = { name: string; coordinates: Point[] };

function decodeXml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .trim();
}

function parseCoordinates(text: string): Point[] {
  return text
    .trim()
    .split(/\s+/)
    .map((token) => token.split(",").map(Number))
    .filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat))
    .map(([lon, lat]) => ({ lon: lon!, lat: lat! }));
}

function parseSegments(kml: string): Segment[] {
  const placemarks = [...kml.matchAll(/<Placemark\b[^>]*>([\s\S]*?)<\/Placemark>/gi)];
  const segments: Segment[] = [];
  for (const placemark of placemarks) {
    const body = placemark[1] ?? "";
    const name = decodeXml(body.match(/<name>([\s\S]*?)<\/name>/i)?.[1] ?? `Route ${segments.length + 1}`);
    for (const match of body.matchAll(/<LineString\b[^>]*>([\s\S]*?)<\/LineString>/gi)) {
      const coordinatesText = match[1]?.match(/<coordinates>([\s\S]*?)<\/coordinates>/i)?.[1] ?? "";
      const coordinates = parseCoordinates(coordinatesText);
      if (coordinates.length >= 2) segments.push({ name, coordinates });
    }
  }
  if (segments.length === 0) {
    for (const match of kml.matchAll(/<LineString\b[^>]*>([\s\S]*?)<\/LineString>/gi)) {
      const coordinatesText = match[1]?.match(/<coordinates>([\s\S]*?)<\/coordinates>/i)?.[1] ?? "";
      const coordinates = parseCoordinates(coordinatesText);
      if (coordinates.length >= 2) segments.push({ name: `Route ${segments.length + 1}`, coordinates });
    }
  }
  return segments;
}

function haversineKm(a: Point, b: Point): number {
  const rad = (v: number) => (v * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

function distanceKm(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversineKm(points[i - 1]!, points[i]!);
  return Math.round(total * 10) / 10;
}

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function segmentKml(segment: Segment): string {
  const coords = segment.coordinates.map((p) => `${p.lon},${p.lat},0`).join(" ");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><name>${escapeXml(segment.name)}</name><LineString><tessellate>1</tessellate><coordinates>${coords}</coordinates></LineString></Placemark></Document></kml>\n`;
}

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function main() {
  console.log(`Downloading My Maps KML: ${KML_URL}`);
  const response = await fetch(KML_URL, { redirect: "follow", headers: { "user-agent": "Mozilla/5.0" } });
  if (!response.ok) throw new Error(`My Maps download failed: ${response.status} ${response.statusText}`);
  const kml = await response.text();
  const segments = parseSegments(kml);
  if (!segments.length) throw new Error("No LineString routes found in My Maps KML");

  const builder = path.resolve(BUILDER_DIR);
  const externalDir = path.join(builder, "data", "external-routes");
  await fs.mkdir(externalDir, { recursive: true });

  const routeDays = [];
  const csvRows = ["天數,日期,路線(文字版本),中午休息點(暫定),中午休息點公里數,終點住宿點,當日總公里數"];

  for (let i = 0; i < segments.length; i++) {
    const day = i + 1;
    const segment = segments[i]!;
    const first = segment.coordinates[0]!;
    const last = segment.coordinates.at(-1)!;
    const km = distanceKm(segment.coordinates);
    const file = `day-${String(day).padStart(2, "0")}.kml`;
    await fs.writeFile(path.join(externalDir, file), segmentKml(segment), "utf8");
    routeDays.push({
      day,
      date: "2026-01-01",
      weekday: "",
      type: "ride",
      title: segment.name,
      start: `${segment.name} 起點`,
      end: `${segment.name} 終點`,
      distanceKm: km,
      lunchStop: null,
      lunchDistanceKm: null,
      endAccommodation: `${segment.name} 終點`,
      externalRoutePath: `data/external-routes/${file}`,
      description: segment.name,
      waypoints: [
        { name: `${segment.name} 起點`, lat: first.lat, lon: first.lon },
        { name: `${segment.name} 終點`, lat: last.lat, lon: last.lon }
      ]
    });
    csvRows.push([day, "1/1週四", segment.name, "", "", `${segment.name} 終點`, km].map(csvCell).join(","));
  }

  await fs.writeFile(path.join(builder, "data", "route-waypoints.json"), JSON.stringify(routeDays, null, 2) + "\n", "utf8");
  await fs.writeFile(path.join(builder, "routes.csv"), csvRows.join("\n") + "\n", "utf8");
  await fs.mkdir("tmp", { recursive: true });
  await fs.writeFile("tmp/mymaps-source.kml", kml, "utf8");
  console.log(`Prepared ${segments.length} route segment(s) for iron-camel build-routes.ts`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
