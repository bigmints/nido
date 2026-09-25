import type { Ingredient, Unit } from "../recipes/types";

export type BaseUnit = "g" | "ml" | "u" | "pizca";

const TO_BASE: Record<Unit, { unit: BaseUnit; factor: number }> = {
  g: { unit: "g", factor: 1 },
  kg: { unit: "g", factor: 1000 },
  ml: { unit: "ml", factor: 1 },
  cl: { unit: "ml", factor: 10 },
  l: { unit: "ml", factor: 1000 },
  cda: { unit: "ml", factor: 15 },
  cdta: { unit: "ml", factor: 5 },
  u: { unit: "u", factor: 1 },
  pizca: { unit: "pizca", factor: 1 },
};

export const UNITS = Object.keys(TO_BASE) as Unit[];

export function isUnit(x: string): x is Unit {
  return x in TO_BASE;
}

/** Convert any supported unit to its base unit (g, ml, u, pizca). */
export function toBase(qty: number, unit: Unit): { qty: number; unit: BaseUnit } {
  const { unit: u, factor } = TO_BASE[unit];
  return { qty: qty * factor, unit: u };
}

export function sameDimension(a: Unit, b: Unit): boolean {
  return TO_BASE[a].unit === TO_BASE[b].unit;
}

const ING_RE = /^(\d+(?:[.,]\d+)?)\s*(kg|g|ml|cl|l|u|cda|cdta|pizca)\s+(.+)$/i;

/** Parse the compact recipe notation, e.g. "200 g arroz" or "2 cda aceite de oliva". */
export function parseIngredient(text: string): Ingredient {
  const m = ING_RE.exec(text.trim());
  if (!m) throw new Error(`Invalid ingredient: "${text}"`);
  return {
    qty: parseFloat(m[1].replace(",", ".")),
    unit: m[2].toLowerCase() as Unit,
    name: m[3].trim(),
  };
}

function trim(n: number): string {
  const r = n >= 100 ? Math.round(n) : Math.round(n * 10) / 10;
  return String(r).replace(".", ",");
}

/** Human friendly quantity from a base-unit amount: 1500 g -> "1,5 kg". */
export function formatQty(qty: number, unit: BaseUnit | Unit, imperial = false): string {
  const base = toBase(qty, unit as Unit);
  if (base.unit === "pizca") return "al gusto";
  if (base.unit === "u") return trim(Math.ceil(base.qty - 1e-9));
  if (base.unit === "g") {
    if (imperial) {
      return base.qty >= 453 ? `${trim(base.qty / 453.592)} lb` : `${trim(base.qty / 28.3495)} oz`;
    }
    return base.qty >= 1000 ? `${trim(base.qty / 1000)} kg` : `${trim(base.qty)} g`;
  }
  if (imperial) return `${trim(base.qty / 29.5735)} fl oz`;
  return base.qty >= 1000 ? `${trim(base.qty / 1000)} l` : `${trim(base.qty)} ml`;
}
