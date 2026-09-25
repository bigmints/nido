// Renders public/icons/icon.svg to the PNG sizes needed by the manifest and iOS.
// Usage: node scripts/icons.mjs   (requires `npx playwright install chromium`)
import { chromium } from "playwright";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "public/icons/icon.svg"), "utf8");
// maskable: full-bleed background, artwork shrunk into the safe zone
const maskable = svg
  .replace('rx="120"', 'rx="0"')
  .replace('<g id="art">', '<g id="art" transform="translate(76.8 76.8) scale(.7)">');

const jobs = [
  ["icon-192.png", svg, 192],
  ["icon-512.png", svg, 512],
  ["apple-touch-icon.png", svg, 180],
  ["icon-maskable-512.png", maskable, 512],
];

const browser = await chromium.launch();
for (const [name, source, size] of jobs) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${source.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`,
  );
  await page.screenshot({ path: join(root, "public/icons", name), omitBackground: true });
  await page.close();
  console.log("wrote", name);
}
await browser.close();
