import { findCatalog, ingredientMatches } from "./catalog";
import type { Diet, MealSlot, RankedRecipe, Recipe } from "./types";

export interface RankOptions {
  diets?: Diet[];
  meal?: MealSlot;
  maxTime?: number;
  /** minimum share of non-staple ingredients you must have (0..1) */
  minRatio?: number;
}

/**
 * Rank recipes by how many of their (non-staple) ingredients are in the fridge.
 * Pantry staples (salt, oil, water...) are assumed to be at home.
 */
export function rankRecipes(
  recipes: Recipe[],
  fridge: string[],
  opts: RankOptions = {},
): RankedRecipe[] {
  const out: RankedRecipe[] = [];
  for (const recipe of recipes) {
    if (opts.diets?.some((d) => !recipe.diet.includes(d))) continue;
    if (opts.meal && !recipe.meals.includes(opts.meal)) continue;
    if (opts.maxTime && recipe.time > opts.maxTime) continue;
    const have: string[] = [];
    const missing: string[] = [];
    for (const ing of recipe.ingredients) {
      if (findCatalog(ing.name)?.staple) continue;
      if (fridge.some((f) => ingredientMatches(f, ing.name))) have.push(ing.name);
      else missing.push(ing.name);
    }
    const total = have.length + missing.length;
    const ratio = total === 0 ? 1 : have.length / total;
    if (have.length === 0 && total > 0) continue;
    if (opts.minRatio && ratio < opts.minRatio) continue;
    out.push({ recipe, have, missing, ratio });
  }
  return out.sort(
    (a, b) =>
      b.ratio - a.ratio ||
      a.missing.length - b.missing.length ||
      a.recipe.time - b.recipe.time ||
      a.recipe.name.localeCompare(b.recipe.name, "es"),
  );
}
