import { describe, expect, it } from "vitest";
import { RECIPES } from "@/lib/recipes";
import { CATALOG, canon, findCatalog, ingredientMatches } from "@/lib/recipes/catalog";
import { rankRecipes } from "@/lib/recipes/match";
import { deriveDiets } from "@/lib/recipes/nutrition";
import { parseIngredient } from "@/lib/shopping/units";

const byId = (id: string) => {
  const r = RECIPES.find((x) => x.id === id);
  if (!r) throw new Error(`missing recipe ${id}`);
  return r;
};

describe("recipe dataset", () => {
  it("ships at least 60 recipes with unique ids", () => {
    expect(RECIPES.length).toBeGreaterThanOrEqual(60);
    expect(new Set(RECIPES.map((r) => r.id)).size).toBe(RECIPES.length);
  });

  it("only uses ingredients that exist in the catalog (so sections and diets are known)", () => {
    const unknown = RECIPES.flatMap((r) =>
      r.ingredients.filter((i) => !findCatalog(i.name)).map((i) => `${r.id}: ${i.name}`),
    );
    expect(unknown).toEqual([]);
  });

  it("every recipe is complete and covers all three meal types overall", () => {
    for (const r of RECIPES) {
      expect(r.ingredients.length).toBeGreaterThan(1);
      expect(r.steps.length).toBeGreaterThan(1);
      expect(r.time).toBeGreaterThan(0);
      expect(r.meals.length).toBeGreaterThan(0);
    }
    for (const m of ["breakfast", "lunch", "dinner"] as const) {
      expect(RECIPES.filter((r) => r.meals.includes(m)).length).toBeGreaterThanOrEqual(8);
    }
  });
});

describe("ingredient parsing and matching", () => {
  it("parses compact notation", () => {
    expect(parseIngredient("200 g arroz")).toEqual({ qty: 200, unit: "g", name: "arroz" });
    expect(parseIngredient("1,5 l caldo de verduras")).toEqual({
      qty: 1.5,
      unit: "l",
      name: "caldo de verduras",
    });
    expect(() => parseIngredient("arroz")).toThrow();
  });

  it("is accent, case and plural insensitive and understands aliases", () => {
    expect(canon("Champiñones")).toBe(canon("champiñón"));
    expect(ingredientMatches("Huevos", "huevo")).toBe(true);
    expect(ingredientMatches("papa", "patata")).toBe(true);
    expect(ingredientMatches("jamon", "jamón serrano")).toBe(true);
  });

  it("free text matches whole words but exact catalog items do not match fuzzily", () => {
    expect(ingredientMatches("pollo", "pechuga de pollo")).toBe(true);
    expect(ingredientMatches("queso", "queso rallado")).toBe(true);
    // "tomate" is a catalog item: it must not satisfy "tomate frito"
    expect(ingredientMatches("tomate", "tomate frito")).toBe(false);
    expect(ingredientMatches("arroz", "arroz")).toBe(true);
    expect(ingredientMatches("leche", "leche de coco")).toBe(false);
  });

  it("catalog aliases point to real entries", () => {
    expect(findCatalog("wrap")?.name).toBe("tortilla de trigo");
    expect(CATALOG.filter((c) => c.staple).map((c) => c.name)).toContain("aceite de oliva");
  });
});

describe("diet derivation", () => {
  it("flags vegetarian, vegan and gluten-free from ingredient flags", () => {
    expect(byId("tortilla-patata").diet).toContain("vegetariano");
    expect(byId("tortilla-patata").diet).not.toContain("vegano");
    expect(byId("tortilla-patata").diet).toContain("sin-gluten");
    expect(byId("gazpacho").diet).toEqual(expect.arrayContaining(["vegano", "vegetariano"]));
    expect(byId("pasta-tomate").diet).not.toContain("sin-gluten");
    expect(byId("carbonara").diet).not.toContain("vegetariano");
    expect(deriveDiets([{ name: "miel", qty: 1, unit: "cda" }])).not.toContain("vegano");
  });
});

describe("rankRecipes", () => {
  const fridge = ["huevos", "patatas", "cebolla"];

  it("puts the recipe with the best coverage first and reports what is missing", () => {
    const ranked = rankRecipes(RECIPES, fridge);
    expect(ranked[0].recipe.id).toBe("tortilla-patata");
    expect(ranked[0].ratio).toBe(1);
    expect(ranked[0].missing).toEqual([]);
    const other = ranked.find((r) => r.recipe.id === "tostada-aguacate");
    expect(other?.missing).toContain("pan");
  });

  it("orders by ratio, then by fewer missing ingredients", () => {
    const ranked = rankRecipes(RECIPES, fridge);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].ratio).toBeGreaterThanOrEqual(ranked[i].ratio);
    }
  });

  it("ignores pantry staples when scoring", () => {
    const r = byId("tortilla-patata");
    const ranked = rankRecipes([r], ["huevo", "patata", "cebolla"]);
    // salt and oil are staples: not counted as have or missing
    expect(ranked[0].have.length + ranked[0].missing.length).toBe(3);
  });

  it("drops recipes with zero matches and respects diet, meal and time filters", () => {
    expect(rankRecipes(RECIPES, ["kiwi"]).every((r) => r.have.includes("kiwi"))).toBe(true);
    expect(rankRecipes(RECIPES, [])).toEqual([]);
    const vegan = rankRecipes(RECIPES, ["garbanzos", "espinacas", "tomate"], { diets: ["vegano"] });
    expect(vegan.length).toBeGreaterThan(0);
    expect(vegan.every((r) => r.recipe.diet.includes("vegano"))).toBe(true);
    const quick = rankRecipes(RECIPES, ["huevo", "pan", "aguacate"], {
      maxTime: 10,
      meal: "breakfast",
    });
    expect(quick.every((r) => r.recipe.time <= 10 && r.recipe.meals.includes("breakfast"))).toBe(
      true,
    );
    expect(quick.length).toBeGreaterThan(0);
  });
});
