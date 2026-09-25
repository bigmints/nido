export interface ColorInfo {
  id: string;
  hex: string;
  neutral: boolean;
  /** 0..360 hue for chromatic colors */
  hue: number;
  /** soft/pastel tones combine with almost anything */
  soft: boolean;
}

export const COLORS: ColorInfo[] = [
  { id: "negro", hex: "#26221f", neutral: true, hue: 0, soft: false },
  { id: "blanco", hex: "#fbf9f4", neutral: true, hue: 0, soft: true },
  { id: "crema", hex: "#f2e8d5", neutral: true, hue: 40, soft: true },
  { id: "gris", hex: "#a8a5a2", neutral: true, hue: 0, soft: true },
  { id: "beige", hex: "#d9c2a0", neutral: true, hue: 35, soft: true },
  { id: "marron", hex: "#8a5a3c", neutral: true, hue: 25, soft: false },
  { id: "marino", hex: "#23345a", neutral: true, hue: 220, soft: false },
  { id: "denim", hex: "#5f82ad", neutral: true, hue: 213, soft: false },
  { id: "rojo", hex: "#d23b47", neutral: false, hue: 355, soft: false },
  { id: "burdeos", hex: "#7c2238", neutral: false, hue: 345, soft: false },
  { id: "naranja", hex: "#ee8a3b", neutral: false, hue: 28, soft: false },
  { id: "amarillo", hex: "#f2c94c", neutral: false, hue: 48, soft: false },
  { id: "verde", hex: "#4f9a6a", neutral: false, hue: 145, soft: false },
  { id: "oliva", hex: "#7d8348", neutral: false, hue: 65, soft: false },
  { id: "menta", hex: "#a9dcc3", neutral: false, hue: 152, soft: true },
  { id: "celeste", hex: "#a7cdf0", neutral: false, hue: 208, soft: true },
  { id: "azul", hex: "#3b6fd0", neutral: false, hue: 220, soft: false },
  { id: "lila", hex: "#c5b1ea", neutral: false, hue: 265, soft: true },
  { id: "morado", hex: "#7a4bb0", neutral: false, hue: 272, soft: false },
  { id: "rosa", hex: "#f0a7c0", neutral: false, hue: 340, soft: true },
  { id: "fucsia", hex: "#d6338a", neutral: false, hue: 325, soft: false },
];

const byId = new Map(COLORS.map((c) => [c.id, c]));
export const colorInfo = (id: string): ColorInfo | undefined => byId.get(id);
export const colorHex = (id: string): string => byId.get(id)?.hex ?? "#cccccc";

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** How well two colors go together, 0 (clash) .. 1 (always works). */
export function colorCompat(aId: string, bId: string): number {
  const a = byId.get(aId);
  const b = byId.get(bId);
  if (!a || !b) return 0.6;
  if (a.id === b.id) return a.neutral ? 0.95 : 0.85;
  if (a.neutral && b.neutral) {
    // navy + black and brown + black are the classic "risky" neutral pairings
    const pair = [a.id, b.id].sort().join("+");
    return pair === "marino+negro" || pair === "marron+negro" ? 0.6 : 0.95;
  }
  if (a.neutral || b.neutral) return 0.9;
  if (a.soft && b.soft) return 0.82;
  const d = hueDistance(a.hue, b.hue);
  const bold = !a.soft && !b.soft;
  if (d <= 60) return bold ? 0.75 : 0.85; // analogous
  if (d >= 150) return bold ? 0.45 : 0.8; // complementary (loud pairs like red+green clash)
  if (bold) return d < 90 ? 0.3 : 0.42; // two loud unrelated colors: clash
  return 0.65;
}

/** Average pairwise compatibility of primary colors; also reports if the palette is mostly neutral. */
export function paletteScore(primaryColors: string[]): { score: number; neutral: boolean } {
  const cols = primaryColors.filter(Boolean);
  if (cols.length < 2) return { score: 1, neutral: true };
  let sum = 0;
  let n = 0;
  for (let i = 0; i < cols.length; i++) {
    for (let j = i + 1; j < cols.length; j++) {
      sum += colorCompat(cols[i], cols[j]);
      n++;
    }
  }
  const loud = new Set(cols.filter((c) => !byId.get(c)?.neutral && !byId.get(c)?.soft));
  let score = sum / n;
  if (loud.size > 2) score -= 0.2; // more than two statement colors
  const chromatic = cols.filter((c) => !byId.get(c)?.neutral);
  return { score: Math.max(0, Math.min(1, score)), neutral: chromatic.length <= 1 };
}
