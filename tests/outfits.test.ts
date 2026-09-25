import { describe, expect, it } from "vitest";
import {
  availableOutfits,
  recentItemIds,
  recentOutfitIds,
  repeatsWithin,
} from "@/lib/outfits/calendar";
import { colorCompat, paletteScore } from "@/lib/outfits/colors";
import { idsToSlots, isComplete, placeItem, removeSlot, slotsToIds } from "@/lib/outfits/compose";
import { outfitWarmth, suggestOutfits, warmthTarget } from "@/lib/outfits/engine";
import type { Outfit, WardrobeItem } from "@/lib/outfits/types";
import { DEMO_OUTFITS, DEMO_WARDROBE } from "@/lib/seed";

const item = (
  id: string,
  category: WardrobeItem["category"],
  colors: string[],
  warmth: WardrobeItem["warmth"],
  formality: WardrobeItem["formality"] = "casual",
  tags: string[] = [],
): WardrobeItem => ({
  id,
  name: id,
  category,
  colors,
  warmth,
  formality,
  seasons: [],
  tags,
});

describe("warmth", () => {
  it("maps temperature to a warmth need between 1 and 5", () => {
    expect(warmthTarget(35)).toBe(1);
    expect(warmthTarget(26)).toBe(1);
    expect(warmthTarget(21)).toBe(2);
    expect(warmthTarget(17)).toBe(3);
    expect(warmthTarget(12)).toBe(4);
    expect(warmthTarget(-10)).toBe(5);
  });

  it("adds a share of the outer layer", () => {
    const tee = item("t", "top", ["blanco"], 1);
    const jeans = item("j", "bottom", ["denim"], 3);
    const coat = item("c", "outerwear", ["beige"], 5);
    expect(outfitWarmth([tee, jeans])).toBe(2);
    expect(outfitWarmth([tee, jeans], coat)).toBe(5);
  });
});

describe("color rules", () => {
  it("neutrals go with everything", () => {
    expect(colorCompat("negro", "rojo")).toBeGreaterThanOrEqual(0.85);
    expect(colorCompat("beige", "fucsia")).toBeGreaterThanOrEqual(0.85);
  });
  it("two loud unrelated colors clash", () => {
    expect(colorCompat("rojo", "verde")).toBeLessThan(0.5);
    expect(colorCompat("naranja", "fucsia")).toBeLessThan(0.5);
  });
  it("pastels combine with each other and analogous colors work", () => {
    expect(colorCompat("rosa", "celeste")).toBeGreaterThanOrEqual(0.8);
    expect(colorCompat("azul", "morado")).toBeGreaterThanOrEqual(0.7);
  });
  it("navy + black is a risky neutral pairing", () => {
    expect(colorCompat("marino", "negro")).toBeLessThan(colorCompat("marino", "beige"));
  });
  it("penalises more than two statement colors and flags neutral palettes", () => {
    expect(paletteScore(["rojo", "verde", "naranja"]).score).toBeLessThan(0.4);
    expect(paletteScore(["negro", "blanco", "rojo"]).neutral).toBe(true);
    expect(paletteScore(["rojo"]).score).toBe(1);
  });
});

describe("suggestOutfits", () => {
  const closet: WardrobeItem[] = [
    item("tee", "top", ["blanco"], 1),
    item("knit", "top", ["crema"], 4),
    item("shirt", "top", ["celeste"], 2, "smart"),
    item("jeans", "bottom", ["denim"], 3),
    item("slacks", "bottom", ["negro"], 3, "smart"),
    item("shorts", "bottom", ["denim"], 1),
    item("dress", "dress", ["negro"], 2, "formal"),
    item("trench", "outerwear", ["beige"], 3, "smart", ["impermeable"]),
    item("parka", "outerwear", ["marino"], 5),
    item("sneakers", "shoes", ["blanco"], 2),
    item("sandals", "shoes", ["beige"], 1, "casual", ["abierto"]),
    item("heels", "shoes", ["negro"], 2, "formal"),
  ];
  const weather = (tempC: number, rain = false) => ({ tempC, rain });

  it("suggests light outfits without outerwear in the heat", () => {
    const [best] = suggestOutfits(closet, { weather: weather(30), occasion: "casual" });
    expect(best.itemIds).not.toContain("parka");
    expect(best.itemIds).not.toContain("trench");
    expect(best.itemIds.some((id) => ["tee", "shorts"].includes(id))).toBe(true);
  });

  it("adds a warm outer layer and avoids open shoes in the cold", () => {
    const [best] = suggestOutfits(closet, { weather: weather(4), occasion: "casual" });
    expect(best.itemIds).toContain("parka");
    expect(best.itemIds).not.toContain("sandals");
    expect(best.itemIds).not.toContain("shorts");
  });

  it("prefers a waterproof layer when it rains", () => {
    const [best] = suggestOutfits(closet, { weather: weather(15, true), occasion: "casual" });
    expect(best.itemIds).toContain("trench");
    expect(best.reasons).toContain("rainCoat");
    expect(best.itemIds).not.toContain("sandals");
  });

  it("goes for the dress and heels for a party", () => {
    const [best] = suggestOutfits(closet, { weather: weather(22), occasion: "party" });
    expect(best.itemIds).toContain("dress");
    expect(best.reasons).toContain("partyDress");
  });

  it("picks smart pieces for work", () => {
    const [best] = suggestOutfits(closet, { weather: weather(20), occasion: "work" });
    expect(best.itemIds).toContain("slacks");
  });

  it("uses sport items for sport when available", () => {
    const sporty = [
      ...closet,
      item("leggings", "bottom", ["negro"], 2, "casual", ["deporte"]),
      item("sporttop", "top", ["lila"], 1, "casual", ["deporte"]),
      item("runners", "shoes", ["lila"], 2, "casual", ["deporte"]),
    ];
    const [best] = suggestOutfits(sporty, { weather: weather(20), occasion: "sport" });
    expect(best.itemIds).toEqual(expect.arrayContaining(["leggings", "sporttop", "runners"]));
    expect(best.reasons).toContain("sportGear");
  });

  it("avoids color clashes", () => {
    const clashy = [
      item("redtop", "top", ["rojo"], 2),
      item("greenpants", "bottom", ["verde"], 2),
      item("blackpants", "bottom", ["negro"], 2),
      item("shoes", "shoes", ["blanco"], 2),
    ];
    const [best] = suggestOutfits(clashy, { weather: weather(22), occasion: "casual" });
    expect(best.itemIds).toContain("blackpants");
  });

  it("returns distinct suggestions (different main garment) and is deterministic", () => {
    const a = suggestOutfits(closet, { weather: weather(18), occasion: "casual", count: 3 });
    const b = suggestOutfits(closet, { weather: weather(18), occasion: "casual", count: 3 });
    expect(a).toEqual(b);
    const mains = a.map((s) => s.itemIds[0]);
    expect(new Set(mains).size).toBe(mains.length);
    expect(a.length).toBe(3);
  });

  it("scores stay within 0..1 and are sorted", () => {
    const s = suggestOutfits(closet, { weather: weather(10), occasion: "work", count: 4 });
    for (const x of s) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
    for (let i = 1; i < s.length; i++) expect(s[i - 1].score).toBeGreaterThanOrEqual(s[i].score);
  });

  it("penalises recently worn pieces", () => {
    const fresh = suggestOutfits(closet, { weather: weather(20), occasion: "casual", count: 1 })[0];
    const avoid = suggestOutfits(closet, {
      weather: weather(20),
      occasion: "casual",
      count: 1,
      recentItemIds: fresh.itemIds,
    })[0];
    expect(avoid.itemIds.join()).not.toBe(fresh.itemIds.join());
  });

  it("returns nothing when no complete outfit can be built", () => {
    expect(
      suggestOutfits([item("tee", "top", ["blanco"], 1)], {
        weather: weather(20),
        occasion: "casual",
      }),
    ).toEqual([]);
    expect(suggestOutfits([], { weather: weather(20), occasion: "casual" })).toEqual([]);
  });

  it("works with the demo wardrobe for every weather/occasion combination", () => {
    for (const t of [-2, 8, 16, 24, 33]) {
      for (const occasion of ["casual", "work", "party", "sport"] as const) {
        expect(
          suggestOutfits(DEMO_WARDROBE, { weather: weather(t, t < 10), occasion }).length,
        ).toBeGreaterThan(0);
      }
    }
  });
});

describe("outfit composition", () => {
  const tee = item("tee", "top", ["blanco"], 1);
  const jeans = item("jeans", "bottom", ["denim"], 3);
  const dress = item("dress", "dress", ["negro"], 2);

  it("a dress replaces top and bottom, and vice versa", () => {
    let s = placeItem(placeItem({}, tee), jeans);
    expect(isComplete(s)).toBe(true);
    s = placeItem(s, dress);
    expect(s).toEqual({ dress: "dress" });
    s = placeItem(s, tee);
    expect(s).toEqual({ top: "tee" });
    expect(isComplete(s)).toBe(false);
  });

  it("round-trips through ids and ignores missing items", () => {
    const wardrobe = [tee, jeans];
    const slots = placeItem(placeItem({}, tee), jeans);
    expect(idsToSlots(slotsToIds(slots).concat("ghost"), wardrobe)).toEqual(slots);
    expect(removeSlot(slots, "top")).toEqual({ bottom: "jeans" });
  });
});

describe("outfit calendar", () => {
  const outfits: Outfit[] = [
    { id: "a", name: "A", itemIds: ["x"], createdAt: 1 },
    { id: "b", name: "B", itemIds: ["y"], createdAt: 2 },
  ];
  const cal = { "2026-03-10": "a", "2026-03-05": "b" };

  it("finds outfits worn within the window (both directions)", () => {
    expect(repeatsWithin(cal, "2026-03-13", "a", 5)).toBe("2026-03-10");
    expect(repeatsWithin(cal, "2026-03-07", "a", 3)).toBe("2026-03-10");
    expect(repeatsWithin(cal, "2026-03-20", "a", 5)).toBeNull();
    expect(repeatsWithin(cal, "2026-03-10", "a", 5)).toBeNull(); // same day is a replacement, not a repeat
  });

  it("lists outfits that can be worn without repeating, least recently worn first", () => {
    const avail = availableOutfits(outfits, cal, "2026-03-12", 5);
    expect(avail.map((o) => o.id)).toEqual(["b"]);
    expect(availableOutfits(outfits, cal, "2026-03-30", 5).map((o) => o.id)).toEqual(["b", "a"]);
  });

  it("collects recent outfit and item ids", () => {
    expect([...recentOutfitIds(cal, "2026-03-12", 3)]).toEqual(["a"]);
    expect(recentItemIds(cal, outfits, "2026-03-12", 10).sort()).toEqual(["x", "y"]);
  });

  it("demo outfits reference existing demo items", () => {
    const ids = new Set(DEMO_WARDROBE.map((w) => w.id));
    for (const o of DEMO_OUTFITS) for (const id of o.itemIds) expect(ids.has(id)).toBe(true);
  });
});
