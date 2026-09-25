export type Section = "produce" | "meat" | "fish" | "dairy" | "bakery" | "pantry" | "basics";
export const SECTIONS: Section[] = [
  "produce",
  "meat",
  "fish",
  "dairy",
  "bakery",
  "pantry",
  "basics",
];

export type Unit = "g" | "kg" | "ml" | "l" | "cl" | "u" | "cda" | "cdta" | "pizca";
export type Diet = "vegetariano" | "vegano" | "sin-gluten";
export type Difficulty = "facil" | "medio" | "dificil";
export type MealSlot = "breakfast" | "lunch" | "dinner";
export const MEAL_SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner"];

export interface Ingredient {
  name: string;
  qty: number;
  unit: Unit;
}

/** Shape of an entry in `data/recipes.json` (ingredients as compact strings). */
export interface RawRecipe {
  id: string;
  name: string;
  emoji: string;
  hue: number;
  meals: MealSlot[];
  time: number;
  difficulty: Difficulty;
  servings: number;
  ingredients: string[];
  steps: string[];
  diet?: Diet[];
}

export interface Recipe extends Omit<RawRecipe, "ingredients" | "diet"> {
  ingredients: Ingredient[];
  diet: Diet[];
  custom?: boolean;
}

export interface FridgeItem {
  name: string;
  qty?: number;
  unit?: Unit;
}

export interface RankedRecipe {
  recipe: Recipe;
  have: string[];
  missing: string[];
  ratio: number;
}
