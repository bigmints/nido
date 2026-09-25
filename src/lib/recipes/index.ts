import raw from "./data/recipes.json";
import { deriveDiets } from "./nutrition";
import type { RawRecipe, Recipe } from "./types";
import { parseIngredient } from "../shopping/units";

/** Turn the compact JSON notation into a fully typed recipe. */
export function hydrateRecipe(r: RawRecipe): Recipe {
  const { ingredients: rawIngredients, diet, ...rest } = r;
  const ingredients = rawIngredients.map(parseIngredient);
  return { ...rest, ingredients, diet: diet ?? deriveDiets(ingredients) };
}

export const RECIPES: Recipe[] = (raw as RawRecipe[]).map(hydrateRecipe);

export * from "./types";
export { rankRecipes } from "./match";
export { catalogNames, findCatalog, canon } from "./catalog";
