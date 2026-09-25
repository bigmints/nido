// End-to-end smoke test + screenshots against the static export in ./out
// Usage: npm run build && node scripts/smoke.mjs [--shots]
// Open-Meteo is mocked so runs are deterministic and offline-safe.
import { chromium } from "playwright";
import { createServer } from "http";
import { readFile, stat, mkdir } from "fs/promises";
import { join, extname, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "out");
const shotsDir = join(root, "docs", "screenshots");
const shots = process.argv.includes("--shots");
const PORT = 4173;
const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
};

const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = join(out, p);
  try {
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
  } catch {
    file = join(out, p, "index.html");
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
}).listen(PORT);

const results = [];
const check = (name, ok, extra = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  " + extra : ""}`);
};

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const monday = new Date();
monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
const nextMonday = new Date(monday);
nextMonday.setDate(nextMonday.getDate() + 7);

const FORECAST = {
  current: { temperature_2m: 21.4, apparent_temperature: 20.1, weather_code: 2, is_day: 1 },
  daily: {
    temperature_2m_max: [24],
    temperature_2m_min: [14],
    precipitation_probability_max: [10],
  },
};
const GEO = {
  results: [
    {
      name: "Madrid",
      latitude: 40.4168,
      longitude: -3.7038,
      admin1: "Comunidad de Madrid",
      country: "España",
    },
  ],
};

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 860 },
  permissions: ["clipboard-read", "clipboard-write"],
  acceptDownloads: true,
  serviceWorkers: "block",
});
await ctx.route("**/api.open-meteo.com/**", (r) => r.fulfill({ json: FORECAST }));
await ctx.route("**/geocoding-api.open-meteo.com/**", (r) => r.fulfill({ json: GEO }));
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
const shot = async (name) =>
  shots &&
  (await page.waitForTimeout(800), await page.screenshot({ path: join(shotsDir, `${name}.png`) }));
if (shots) await mkdir(shotsDir, { recursive: true });

try {
  // ---- Home, empty state, demo data, weather
  await page.goto(`http://localhost:${PORT}/`);
  await page.getByText("Bienvenida a Nido").waitFor();
  check("home renders welcome state", true);
  await page.getByRole("button", { name: "Cargar datos de ejemplo" }).click();
  await page.getByText("Datos de ejemplo cargados").waitFor();
  check("demo data loads", true);

  await page.getByPlaceholder("Buscar ciudad…").fill("Madrid");
  await page
    .getByRole("button", { name: /Madrid/ })
    .first()
    .click();
  await page.getByText("21°C").waitFor();
  check("weather card (mocked Open-Meteo) via city search", true);
  await page.getByText("Tu outfit de hoy").waitFor();
  check(
    "home shows outfit suggestion for today",
    (await page.getByRole("button", { name: "Ponérmelo hoy" }).count()) > 0,
  );
  await page.getByRole("button", { name: "Ponérmelo hoy" }).click();
  await page.waitForTimeout(300);
  await shot("01-home");

  // ---- Kitchen: fridge
  await page.getByRole("link", { name: "Cocina" }).first().click();
  await page.getByRole("heading", { name: "Qué tengo en la nevera" }).waitFor();
  await page.getByLabel("Añadir ingrediente").fill("champi");
  await page.getByRole("option", { name: "champiñón" }).click();
  check(
    "fridge autocomplete adds ingredient",
    (await page
      .getByRole("list", { name: "Qué tengo en la nevera" })
      .getByText("champiñón")
      .count()) === 1,
  );
  check("recipes ranked by fridge", (await page.getByText(/recetas posibles/).count()) > 0);
  await page.waitForTimeout(500);
  await shot("02-fridge");
  await page
    .getByRole("button", { name: /Huevos revueltos con champiñones/ })
    .first()
    .click();
  await page.getByRole("dialog").getByText("Ingredientes").waitFor();
  check("recipe detail opens", true);
  await shot("03-recipe");
  await page.keyboard.press("Escape");

  // ---- Kitchen: planner (drag and drop + accessible alternative)
  await page.getByRole("tab", { name: "Semana" }).click();
  await page.getByRole("button", { name: /Semana siguiente/ }).click();
  const target = page.getByTestId(`slot-${iso(nextMonday)}:dinner`);
  await target.waitFor();
  const item = page.getByTestId("palette").locator("> div").first();
  const ib = await item.boundingBox();
  const tb = await target.boundingBox();
  await page.mouse.move(ib.x + ib.width / 2, ib.y + ib.height / 2);
  await page.mouse.down();
  await page.mouse.move(ib.x + ib.width / 2 + 12, ib.y + ib.height / 2 + 12, { steps: 4 });
  await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 14 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  check(
    "drag and drop recipe into planner slot",
    (await target.locator(".line-clamp-2").count()) === 1,
  );

  const slot2 = page.getByTestId(`slot-${iso(nextMonday)}:lunch`);
  await slot2.getByRole("button", { name: /Elegir receta/ }).click();
  await page.getByRole("dialog").getByRole("button").nth(1).click();
  await page.waitForTimeout(300);
  check(
    "accessible slot picker fills a slot without dragging",
    (await slot2.locator(".line-clamp-2").count()) === 1,
  );
  await page.getByRole("button", { name: /Esta semana/ }).click();
  await page.waitForTimeout(400);
  await shot("04-planner");

  // ---- Kitchen: shopping list
  await page.getByRole("tab", { name: "Compra" }).click();
  await page.getByRole("heading", { name: "Lista de la compra" }).waitFor();
  const boxes = page.getByRole("checkbox");
  check(
    "shopping list generated from the week",
    (await boxes.count()) > 5,
    `(${await boxes.count()} checkboxes)`,
  );
  await page
    .locator("label", { hasText: /^.*(huevo|tomate|cebolla)/i })
    .first()
    .waitFor()
    .catch(() => {});
  await boxes.nth(2).check({ force: true });
  await page.getByRole("button", { name: "Copiar lista" }).click();
  await page.getByText("Lista copiada").waitFor();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  check(
    "copy to clipboard exports text with checkboxes",
    clip.includes("[ ]") && clip.includes("[x]"),
  );
  check(
    "fridge items are subtracted (aguacate/huevo not listed as huevo when in fridge)",
    !/\[ \] huevo/.test(clip),
  );
  await shot("05-shopping");

  // ---- Wardrobe
  await page.getByRole("link", { name: "Armario" }).first().click();
  await page.getByText("Camiseta blanca básica").first().waitFor();
  check("closet shows demo garments", (await page.getByText("Vaqueros rectos").count()) > 0);
  await shot("06-closet");

  await page.getByRole("tab", { name: "Creador" }).click();
  const tee = page.locator('[aria-label^="Camiseta blanca básica"]').first();
  const board = page.getByTestId("board");
  const drop = async (loc) => {
    const a = await loc.boundingBox();
    const b = await board.boundingBox();
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(a.x + a.width / 2 + 10, a.y + a.height / 2 + 10, { steps: 4 });
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(250);
  };
  await drop(tee);
  check("drag garment onto mannequin", (await board.locator("img, svg[role=img]").count()) >= 1);
  await page.getByRole("button", { name: /^Poner Vaqueros rectos/ }).click();
  await page.getByRole("button", { name: /^Poner Zapatillas blancas/ }).click();
  await page.getByRole("button", { name: /^Poner Chaqueta vaquera/ }).click();
  await page.getByLabel("Nombre del outfit").fill("Paseo de prueba");
  await page.getByRole("button", { name: "Guardar outfit" }).click();
  await page.getByText("Outfit guardado").waitFor();
  check("outfit built and saved", (await page.getByText("Paseo de prueba").count()) > 0);
  // compose again for a nice screenshot
  await page.getByRole("button", { name: /^Poner Blusa negra/ }).click();
  await page.getByRole("button", { name: /^Poner Falda plisada/ }).click();
  await page.getByRole("button", { name: /^Poner Botines/ }).click();
  await page.getByRole("button", { name: /^Poner Blazer negro/ }).click();
  await page.getByRole("button", { name: /^Poner Bolso/ }).click();
  await page.waitForTimeout(400);
  await shot("07-builder");

  await page.getByRole("tab", { name: "Ideas" }).click();
  await page.getByText("Opción 1").waitFor();
  check("outfit suggestions render with reasons", (await page.getByText("Opción").count()) >= 2);
  await page.getByRole("button", { name: "Fiesta" }).click();
  await page.waitForTimeout(300);
  check(
    "party suggestion prefers a dress",
    (await page.locator('[title="Vestido negro de fiesta"]').count()) > 0,
  );
  await page.getByRole("button", { name: "Casual" }).first().click();
  await shot("08-suggestions");

  await page.getByRole("tab", { name: "Calendario" }).click();
  await page.getByText("No repetir el mismo outfit en 5 días").waitFor();
  await shot("09-calendar");

  // ---- Settings
  await page.getByRole("link", { name: "Ajustes" }).first().click();
  await page.getByRole("heading", { name: "Ajustes" }).waitFor();
  const [dl] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /Exportar copia/ }).click(),
  ]);
  check(
    "JSON backup downloads",
    /nido-backup-\d{4}-\d{2}-\d{2}\.json/.test(dl.suggestedFilename()),
  );
  await page.getByRole("button", { name: "English" }).click();
  await page.getByRole("heading", { name: "Language" }).waitFor();
  check("switch language to English", true);
  await page.getByRole("button", { name: "Dark" }).click();
  await page.waitForTimeout(300);
  check(
    "dark theme applies",
    await page.evaluate(() => document.documentElement.classList.contains("dark")),
  );
  await shot("10-settings-dark");
  await page.getByRole("link", { name: "Today" }).first().click();
  await page.getByText("Today's meals").waitFor();
  await shot("11-home-dark");
  await page.reload();
  await page.getByText("Today's meals").waitFor();
  check(
    "settings and data persist across reload (IndexedDB)",
    await page.evaluate(() => document.documentElement.classList.contains("dark")),
  );
  await page
    .getByRole("button", { name: "Settings" })
    .first()
    .waitFor()
    .catch(() => {});

  // ---- Mobile
  await page.getByRole("link", { name: "Settings" }).first().click();
  await page.getByRole("button", { name: "Light" }).click();
  await page.getByRole("button", { name: "Español" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("link", { name: "Hoy" }).last().click();
  await page.getByText("Comidas de hoy").waitFor();
  await page.waitForTimeout(400);
  check(
    "mobile bottom tab bar visible",
    await page.getByRole("navigation", { name: "Navegación principal" }).last().isVisible(),
  );
  await shot("12-mobile-home");
  await page.getByRole("link", { name: "Armario" }).last().click();
  await page.getByRole("tab", { name: "Creador" }).click();
  await page.waitForTimeout(400);
  await shot("13-mobile-builder");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  check("no horizontal overflow on mobile", !overflow);

  const real = errors.filter((e) => !/Failed to load resource|favicon|net::ERR/.test(e));
  check("no console/page errors", real.length === 0, real.slice(0, 3).join(" | "));
} catch (e) {
  check(`unexpected failure: ${String(e).split("\n")[0]}`, false);
  if (shots) await page.screenshot({ path: join(shotsDir, "_failure.png") }).catch(() => {});
} finally {
  await browser.close();
  server.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
