import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { exportBackup, importBackup, parseBackup } from "@/lib/storage/backup";
import { fitWithin } from "@/lib/storage/image";
import { IdbRepository, MemoryRepository, type Repository } from "@/lib/storage/repository";
import { DEFAULT_SETTINGS } from "@/lib/storage/schema";
import { demoData } from "@/lib/seed";

const PHOTO = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";

async function populate(repo: Repository) {
  const demo = demoData("2026-03-04");
  await repo.set("wardrobe", [{ ...demo.wardrobe![0], photoId: "p1" }, ...demo.wardrobe!.slice(1)]);
  await repo.set("outfits", demo.outfits!);
  await repo.set("plan", demo.plan!);
  await repo.set("fridge", [{ name: "huevo" }, { name: "patata", qty: 500, unit: "g" }]);
  await repo.set("outfitCalendar", demo.outfitCalendar!);
  await repo.set("checked", { "arroz|g": true });
  await repo.set("settings", {
    ...DEFAULT_SETTINGS,
    lang: "en",
    city: { name: "Madrid", lat: 40.4, lon: -3.7 },
  });
  await repo.putPhoto("p1", PHOTO);
}

describe.each([
  ["memory", () => new MemoryRepository()],
  ["IndexedDB", () => new IdbRepository(`nido-test-${Math.random()}`)],
])("backup round-trip (%s)", (_name, make) => {
  it("exports and re-imports every piece of data and every photo", async () => {
    const a = make();
    await populate(a);
    const backup = await exportBackup(a, new Date("2026-03-04T10:00:00Z"));
    expect(backup).toMatchObject({
      app: "nido",
      version: 1,
      exportedAt: "2026-03-04T10:00:00.000Z",
    });
    expect(backup.photos).toEqual({ p1: PHOTO });

    const json = JSON.stringify(backup);
    const b = make();
    await b.set("fridge", [{ name: "old data must be replaced" }]);
    await importBackup(b, parseBackup(json));

    expect(await b.getAll()).toEqual(await a.getAll());
    expect(await b.allPhotos()).toEqual({ p1: PHOTO });
    expect((await b.getAll()).settings?.lang).toBe("en");
    expect((await b.getAll()).fridge).toHaveLength(2);
  });

  it("clear() wipes data and photos", async () => {
    const r = make();
    await populate(r);
    await r.clear();
    expect(await r.getAll()).toEqual({});
    expect(await r.allPhotos()).toEqual({});
    expect(await r.getPhoto("p1")).toBeUndefined();
  });
});

describe("parseBackup validation", () => {
  it("rejects garbage, foreign files and future versions", () => {
    expect(() => parseBackup("not json")).toThrow("invalid-json");
    expect(() => parseBackup(JSON.stringify({ hello: 1 }))).toThrow("not-a-nido-backup");
    expect(() => parseBackup(JSON.stringify({ app: "nido", version: 99, data: {} }))).toThrow(
      "unsupported-version",
    );
    expect(() => parseBackup(JSON.stringify({ app: "nido", version: 1 }))).toThrow("missing-data");
    expect(() =>
      parseBackup(JSON.stringify({ app: "nido", version: 1, data: { wardrobe: "nope" } })),
    ).toThrow("bad-wardrobe");
  });

  it("drops unknown keys and non-image photos, and fills missing settings with defaults", () => {
    const b = parseBackup(
      JSON.stringify({
        app: "nido",
        version: 1,
        data: { fridge: [], evil: { x: 1 }, settings: { lang: "en" } },
        photos: { ok: PHOTO, bad: "https://evil.example/x.png", worse: 42 },
      }),
    );
    expect(Object.keys(b.data).sort()).toEqual(["fridge", "settings"]);
    expect(b.data.settings).toEqual({ ...DEFAULT_SETTINGS, lang: "en" });
    expect(Object.keys(b.photos)).toEqual(["ok"]);
  });

  it("never exports the AI configuration", async () => {
    const repo = new MemoryRepository();
    await populate(repo);
    expect(JSON.stringify(await exportBackup(repo))).not.toMatch(/apiKey|nido-ai-config/);
  });
});

describe("image sizing", () => {
  it("keeps aspect ratio and never upscales", () => {
    expect(fitWithin(4000, 3000, 900)).toEqual({ w: 900, h: 675 });
    expect(fitWithin(3000, 4000, 900)).toEqual({ w: 675, h: 900 });
    expect(fitWithin(300, 200, 900)).toEqual({ w: 300, h: 200 });
  });
});
