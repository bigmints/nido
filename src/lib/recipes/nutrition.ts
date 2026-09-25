import { findCatalog } from "./catalog";
import type { Diet, Ingredient } from "./types";

/** Derive diet tags from the ingredient catalog flags. */
export function deriveDiets(ingredients: Ingredient[]): Diet[] {
  const entries = ingredients.map((i) => findCatalog(i.name));
  const diets: Diet[] = [];
  if (!entries.some((e) => e?.meat || e?.fish)) diets.push("vegetariano");
  if (!entries.some((e) => e?.animal)) diets.push("vegano");
  if (!entries.some((e) => e?.gluten)) diets.push("sin-gluten");
  return diets;
}
