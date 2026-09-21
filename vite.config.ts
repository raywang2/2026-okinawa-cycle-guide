import { defineConfig } from "vite";
import fs from "node:fs";
import { createHash } from "node:crypto";

export default defineConfig({
  base: "/2026-okinawa-cycle-guide/",
  plugins: [{
    name: "offline-assets",
    generateBundle(_options, bundle) {
      const staticFiles = ["app.webmanifest", "assets/icon-192.png", "assets/icon-512.png", "assets/vendor/leaflet.js", "assets/vendor/leaflet.css", "assets/vendor/images/marker-icon.png", "assets/vendor/images/marker-icon-2x.png", "assets/vendor/images/marker-shadow.png", "assets/vendor/images/layers.png", "assets/vendor/images/layers-2x.png"];
      for (const file of staticFiles) this.emitFile({ type: "asset", fileName: file, source: fs.readFileSync(file) });
      const dataFiles = ["data/routes.json", "data/ramen.json", ...[1, 2, 3, 4, 5].map(day => `routes/generated/day-0${day}.gpx`)];
      const precache = [...new Set([...Object.keys(bundle), ...staticFiles, ...dataFiles])];
      const hash = createHash("sha256");
      for (const item of Object.values(bundle)) hash.update(item.type === "chunk" ? item.code : item.source);
      for (const file of staticFiles) hash.update(fs.readFileSync(file));
      for (const file of dataFiles) hash.update(fs.readFileSync(`public/${file}`));
      let worker = fs.readFileSync("sw.js", "utf8");
      hash.update(worker);
      worker = worker.replace("okinawa-v1", `okinawa-${hash.digest("hex").slice(0, 12)}`).replace(/^const PRECACHE = .*;$/m, `const PRECACHE = ${JSON.stringify(precache)};`);
      this.emitFile({ type: "asset", fileName: "sw.js", source: worker });
    }
  }],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
