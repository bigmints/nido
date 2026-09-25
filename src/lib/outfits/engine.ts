import { paletteScore } from "./colors";
import {
  TAG_OPEN,
  TAG_SPORT,
  TAG_WATERPROOF,
  type Formality,
  type Occasion,
  type ReasonCode,
  type Suggestion,
  type WardrobeItem,
  type WeatherInput,
} from "./types";

const FORMALITY: Record<Formality, number> = { casual: 1, smart: 2, formal: 3 };
const OCCASION_TARGET: Record<Occasion, number> = { casual: 1, work: 2, party: 2.6, sport: 1 };

/** How much warmth (1..5) the outfit needs for a feels-like temperature. */
export function warmthTarget(tempC: number): 1 | 2 | 3 | 4 | 5 {
  const n = Math.round((26 - tempC) / 4.5) + 1;
  return Math.max(1, Math.min(5, n)) as 1 | 2 | 3 | 4 | 5;
}

/** Effective warmth of an outfit: base layer average plus a share of the outer layer. */
export function outfitWarmth(base: WardrobeItem[], outer?: WardrobeItem | null): number {
  const w = base.map((i) => i.warmth);
  const b = w.length ? w.reduce((a, c) => a + c, 0) / w.length : 1;
  return b + (outer ? outer.warmth * 0.6 : 0);
}

export interface SuggestOptions {
  weather: WeatherInput;
  occasion: Occasion;
  /** items worn recently: slightly penalised so suggestions stay fresh */
  recentItemIds?: string[];
  count?: number;
}

const has = (i: WardrobeItem | null | undefined, tag: string) => !!i?.tags.includes(tag);
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

interface Candidate {
  base: WardrobeItem[];
  shoes: WardrobeItem | null;
  outer: WardrobeItem | null;
}

function scoreCandidate(c: Candidate, o: SuggestOptions): { score: number; reasons: ReasonCode[] } {
  const reasons: ReasonCode[] = [];
  const need = warmthTarget(o.weather.tempC);
  const items = [...c.base, ...(c.shoes ? [c.shoes] : []), ...(c.outer ? [c.outer] : [])];

  // warmth
  const eff = outfitWarmth(c.base, c.outer);
  const warmthScore = clamp01(1 - Math.abs(eff - need) / 2);
  if (warmthScore > 0.8)
    reasons.push(c.outer ? "warmthLayered" : need <= 2 ? "warmthLight" : "warmthPerfect");

  // colors (primary color of each piece)
  const pal = paletteScore(items.map((i) => i.colors[0]));
  if (pal.score >= 0.85) reasons.push(pal.neutral ? "neutralPalette" : "harmony");

  // formality
  const worn = c.base.concat(c.shoes ? [c.shoes] : []);
  // mean deviation per garment (an average would let formal + very casual cancel out)
  const dev =
    worn.reduce((s, i) => s + Math.abs(FORMALITY[i.formality] - OCCASION_TARGET[o.occasion]), 0) /
    worn.length;
  const formalityScore = clamp01(1 - dev / 1.5);
  if (formalityScore > 0.8 && o.occasion !== "sport") reasons.push("formalityMatch");

  let extra = 0.5;
  if (o.occasion === "sport") {
    const sporty = worn.filter((i) => has(i, TAG_SPORT)).length / worn.length;
    extra = sporty;
    if (sporty >= 0.66) reasons.push("sportGear");
    if (c.base.some((i) => i.category === "dress")) extra -= 0.5;
  } else if (o.occasion === "party") {
    if (c.base.some((i) => i.category === "dress")) {
      extra = 1;
      reasons.push("partyDress");
    }
    if (worn.some((i) => has(i, TAG_SPORT))) extra -= 0.5;
  } else if (worn.some((i) => has(i, TAG_SPORT))) {
    extra -= 0.3;
  }

  // rain and cold protection
  let penalty = 0;
  if (o.weather.rain) {
    if (has(c.outer, TAG_WATERPROOF)) {
      extra += 0.3;
      reasons.push("rainCoat");
    } else if (!c.outer) penalty += 0.08;
    if (has(c.shoes, TAG_OPEN)) penalty += 0.15;
  }
  if (need >= 4 && has(c.shoes, TAG_OPEN)) penalty += 0.15;
  if (need <= 2 && c.outer && !(o.weather.rain && has(c.outer, TAG_WATERPROOF))) penalty += 0.12;

  const recent = new Set(o.recentItemIds ?? []);
  const repeated = items.filter((i) => recent.has(i.id)).length;
  penalty += repeated * 0.05;
  if (repeated === 0 && recent.size > 0) reasons.push("fresh");

  // for sport the right gear matters most; otherwise weather, color and formality lead
  const w =
    o.occasion === "sport"
      ? { warm: 0.2, color: 0.2, form: 0.15, extra: 0.45 }
      : { warm: 0.3, color: 0.3, form: 0.25, extra: 0.15 };
  const score =
    warmthScore * w.warm +
    pal.score * w.color +
    formalityScore * w.form +
    clamp01(extra) * w.extra -
    penalty;
  return { score, reasons };
}

/**
 * Rule-based outfit engine (pure, deterministic).
 * Builds every valid combination (dress | top+bottom) x shoes x optional outer layer,
 * scores it for weather, color harmony, formality and occasion, and returns the best
 * distinct suggestions (no two share the same main garment).
 */
export function suggestOutfits(items: WardrobeItem[], o: SuggestOptions): Suggestion[] {
  const by = (cat: WardrobeItem["category"]) => items.filter((i) => i.category === cat);
  const tops = by("top");
  const bottoms = by("bottom");
  const dresses = by("dress");
  const shoes = by("shoes");
  const outers = by("outerwear");
  const accessories = by("accessory");

  const bases: WardrobeItem[][] = [
    ...dresses.map((d) => [d]),
    ...tops.flatMap((t) => bottoms.map((b) => [t, b])),
  ];
  if (bases.length === 0) return [];

  const need = warmthTarget(o.weather.tempC);
  const wantOuter = need >= 3 || o.weather.rain;
  const shoeOptions: (WardrobeItem | null)[] = shoes.length ? shoes : [null];
  const outerOptions: (WardrobeItem | null)[] =
    wantOuter && outers.length ? [...outers, null] : [null];

  const scored: { c: Candidate; score: number; reasons: ReasonCode[] }[] = [];
  for (const base of bases) {
    for (const s of shoeOptions) {
      for (const outer of outerOptions) {
        const c = { base, shoes: s, outer };
        scored.push({ c, ...scoreCandidate(c, o) });
      }
    }
  }
  const key = (x: (typeof scored)[number]) =>
    [...x.c.base, x.c.shoes, x.c.outer].map((i) => i?.id ?? "").join("|");
  scored.sort((a, b) => b.score - a.score || key(a).localeCompare(key(b)));

  const out: Suggestion[] = [];
  const usedBase = new Set<string>();
  for (const s of scored) {
    const mainId = s.c.base[0].id;
    if (usedBase.has(mainId)) continue;
    usedBase.add(mainId);
    const ids = [...s.c.base, ...(s.c.shoes ? [s.c.shoes] : []), ...(s.c.outer ? [s.c.outer] : [])];
    // add the accessory that matches best
    const primary = ids.map((i) => i.colors[0]);
    let bestAcc: WardrobeItem | null = null;
    let bestScore = 0.85;
    for (const a of accessories) {
      const sc = paletteScore([...primary, a.colors[0]]).score;
      if (sc > bestScore) {
        bestScore = sc;
        bestAcc = a;
      }
    }
    if (bestAcc) ids.push(bestAcc);
    out.push({
      itemIds: ids.map((i) => i.id),
      score: Math.round(clamp01(s.score) * 100) / 100,
      reasons: s.reasons,
    });
    if (out.length >= (o.count ?? 3)) break;
  }
  return out;
}
