#!/usr/bin/env node
/*
 * Rebuild manifest.json by scraping the public Google Drive folder.
 * Usage: node tools/build-manifest.mjs
 *
 * Note: relies on the folder being shared as "Anyone with the link → Viewer".
 * Google's HTML structure is unofficial — if it ever changes, this needs an update.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FOLDER_ID = "1PcD3VnHoJz795g_r6Ay4jUrt-qwUj5il";
const FOLDER_URL = `https://drive.google.com/drive/folders/${FOLDER_ID}`;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

async function main() {
  console.log(`Fetching ${FOLDER_URL}…`);
  const res = await fetch(FOLDER_URL, {
    headers: { "User-Agent": "Mozilla/5.0 (kids-gallery manifest builder)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  // Drive embeds file IDs as 28-44 char alphanumeric strings in double quotes.
  // Filter out API keys (AIza…), OAuth client IDs (have dots), reCAPTCHA keys, and the folder ID itself.
  const matches = [...html.matchAll(/"([a-zA-Z0-9_\-]{28,44})"/g)].map((m) => m[1]);
  const seen = new Set();
  const candidates = matches.filter((id) => {
    if (seen.has(id)) return false;
    if (id.startsWith("AIza") || id.startsWith("AA2Yr") || id.startsWith("6Lc")) return false;
    if (id.includes(".") || id === FOLDER_ID) return false;
    if (!/^1/.test(id)) return false; // Drive file IDs almost always start with "1"
    seen.add(id);
    return true;
  });

  console.log(`Found ${candidates.length} candidate IDs. Verifying each is an image…`);
  const images = [];
  for (const id of candidates) {
    const probe = await fetch(`https://lh3.googleusercontent.com/d/${id}=w400`, {
      method: "HEAD",
    });
    const type = probe.headers.get("content-type") || "";
    if (probe.ok && type.startsWith("image/")) {
      images.push({ id });
      process.stdout.write(".");
    } else {
      process.stdout.write("x");
    }
  }
  process.stdout.write("\n");

  const manifest = {
    folder: FOLDER_URL,
    updatedAt: new Date().toISOString().slice(0, 10),
    images,
  };
  const outPath = path.join(REPO_ROOT, "manifest.json");
  await fs.writeFile(outPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Wrote ${images.length} images to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
