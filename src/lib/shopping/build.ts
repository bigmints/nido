import { peopleFor, type PeopleByDay } from "../people";
import { canon, findCatalog, ingredientMatches } from "../recipes/catalog";
import type { FridgeItem, MealSlot, Recipe, Section } from "../recipes/types";
import { SECTIONS } from "../recipes/types";
import { toBase, type BaseUnit } from "./units";

/** plan key: "YYYY-MM-DD:breakfast" -> recipe id */
export type Plan = Record<string, string>;
export const planKey = (date: string, slot: MealSlot) => `${date}:${slot}`;

export interface ShoppingItem {
  key: string;
  name: string;
  qty: number;
  unit: BaseUnit;
  section: Section;
  recipes: string[];
}

export interface ShoppingSection {
  section: Section;
  items: ShoppingItem[];
}

export interface BuildOptions {
  plan: Plan;
  recipes: Recipe[];
  dates: string[];
  fridge: FridgeItem[];
  /** default number of people (recipes are scaled from their `servings`) */
  people?: number;
  /** per-day overrides of `people`, keyed by date */
  peopleByDay?: PeopleByDay;
  includeStaples?: boolean;
}

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Build the shopping list for a set of days:
 *  1. collect ingredients of planned recipes (scaled to `people`)
 *  2. merge same ingredient + same unit dimension (2 x 200 g -> 400 g, 1 kg + 500 g -> 1500 g)
 *  3. subtract what is in the fridge (whole item if no quantity given)
 *  4. group by supermarket section
 */
export function buildShoppingList(o: BuildOptions): ShoppingSection[] {
  const byId = new Map(o.recipes.map((r) => [r.id, r]));
  const acc = new Map<string, ShoppingItem>();

  for (const date of o.dates) {
    for (const slot of ["breakfast", "lunch", "dinner"] as MealSlot[]) {
      const recipe = byId.get(o.plan[planKey(date, slot)] ?? "");
      if (!recipe) continue;
      const people = o.people ? peopleFor(o.peopleByDay, o.people, date) : 0;
      const factor = people ? people / recipe.servings : 1;
      for (const ing of recipe.ingredients) {
        const cat = findCatalog(ing.name);
        if (cat?.staple && !o.includeStaples) continue;
        const base = toBase(ing.qty * factor, ing.unit);
        const key = `${canon(cat?.name ?? ing.name)}|${base.unit}`;
        const cur = acc.get(key);
        if (cur) {
          cur.qty += base.qty;
          if (!cur.recipes.includes(recipe.name)) cur.recipes.push(recipe.name);
        } else {
          acc.set(key, {
            key,
            name: cat?.name ?? ing.name,
            qty: base.qty,
            unit: base.unit,
            section: cat?.section ?? "pantry",
            recipes: [recipe.name],
          });
        }
      }
    }
  }

  // subtract the fridge
  for (const item of acc.values()) {
    for (const f of o.fridge) {
      if (!ingredientMatches(f.name, item.name) || item.qty <= 0) continue;
      if (f.qty != null && f.unit) {
        const fb = toBase(f.qty, f.unit);
        if (fb.unit === item.unit) item.qty -= fb.qty;
        // incompatible unit (e.g. fridge in "u", recipe in "g"): cannot compare, keep on the list
      } else {
        item.qty = 0;
      }
    }
  }

  const items = [...acc.values()]
    .filter((i) => i.qty > 1e-9)
    .map((i) => ({ ...i, qty: round(i.qty) }));
  return SECTIONS.map((section) => ({
    section,
    items: items
      .filter((i) => i.section === section)
      .sort((a, b) => a.name.localeCompare(b.name, "es")),
  })).filter((s) => s.items.length > 0);
}
