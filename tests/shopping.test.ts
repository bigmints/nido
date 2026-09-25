import { describe, expect, it } from "vitest";
import type { Recipe } from "@/lib/recipes/types";
import { buildShoppingList, planKey, type Plan } from "@/lib/shopping/build";
import { shoppingToText } from "@/lib/shopping/text";
import { formatQty, parseIngredient, sameDimension, toBase } from "@/lib/shopping/units";

const mk = (id: string, servings: number, ings: string[]): Recipe => ({
  id,
  name: id,
  emoji: "x",
  hue: 0,
  meals: ["lunch"],
  time: 10,
  difficulty: "facil",
  servings,
  ingredients: ings.map(parseIngredient),
  steps: ["a", "b"],
  diet: [],
});

const dates = ["2026-03-02", "2026-03-03"];
const plan = (...ids: [string, string, string][]): Plan =>
  Object.fromEntries(ids.map(([d, s, id]) => [planKey(d, s as "lunch"), id]));

const flat = (list: ReturnType<typeof buildShoppingList>) => list.flatMap((s) => s.items);

describe("units", () => {
  it("normalises to base units", () => {
    expect(toBase(1.5, "kg")).toEqual({ qty: 1500, unit: "g" });
    expect(toBase(2, "l")).toEqual({ qty: 2000, unit: "ml" });
    expect(toBase(3, "cda")).toEqual({ qty: 45, unit: "ml" });
    expect(toBase(2, "cdta")).toEqual({ qty: 10, unit: "ml" });
    expect(toBase(25, "cl")).toEqual({ qty: 250, unit: "ml" });
    expect(sameDimension("kg", "g")).toBe(true);
    expect(sameDimension("g", "ml")).toBe(false);
  });

  it("formats friendly quantities", () => {
    expect(formatQty(400, "g")).toBe("400 g");
    expect(formatQty(1500, "g")).toBe("1,5 kg");
    expect(formatQty(1000, "ml")).toBe("1 l");
    expect(formatQty(250, "ml")).toBe("250 ml");
    expect(formatQty(2.2, "u")).toBe("3");
    expect(formatQty(1, "pizca")).toBe("al gusto");
    expect(formatQty(453.592, "g", true)).toBe("1 lb");
  });
});

describe("buildShoppingList: merging", () => {
  it("merges 2 x 200 g into 400 g", () => {
    const list = flat(
      buildShoppingList({
        plan: plan(["2026-03-02", "lunch", "a"], ["2026-03-03", "lunch", "b"]),
        recipes: [mk("a", 2, ["200 g arroz"]), mk("b", 2, ["200 g arroz"])],
        dates,
        fridge: [],
      }),
    );
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ name: "arroz", qty: 400, unit: "g", recipes: ["a", "b"] });
  });

  it("merges across units of the same dimension (kg + g, l + ml, cda + ml)", () => {
    const list = flat(
      buildShoppingList({
        plan: plan(["2026-03-02", "lunch", "a"], ["2026-03-03", "lunch", "b"]),
        recipes: [
          mk("a", 1, ["1 kg patata", "1 l leche", "2 cda miel"]),
          mk("b", 1, ["500 g patata", "250 ml leche", "30 ml miel"]),
        ],
        dates,
        fridge: [],
      }),
    );
    const get = (n: string) => list.find((i) => i.name === n);
    expect(get("patata")).toMatchObject({ qty: 1500, unit: "g" });
    expect(get("leche")).toMatchObject({ qty: 1250, unit: "ml" });
    expect(get("miel")).toMatchObject({ qty: 60, unit: "ml" });
  });

  it("keeps different dimensions of the same ingredient as separate lines", () => {
    const list = flat(
      buildShoppingList({
        plan: plan(["2026-03-02", "lunch", "a"], ["2026-03-03", "lunch", "b"]),
        recipes: [mk("a", 1, ["2 u cebolla"]), mk("b", 1, ["100 g cebolla"])],
        dates,
        fridge: [],
      }),
    );
    expect(list.filter((i) => i.name === "cebolla")).toHaveLength(2);
  });

  it("only includes the requested dates and skips staples by default", () => {
    const r = mk("a", 1, ["100 g arroz", "2 cda aceite de oliva", "1 pizca sal"]);
    const opts = {
      plan: plan(["2026-03-02", "lunch", "a"], ["2026-03-09", "lunch", "a"]),
      recipes: [r],
      dates,
      fridge: [],
    };
    expect(flat(buildShoppingList(opts)).map((i) => i.name)).toEqual(["arroz"]);
    expect(flat(buildShoppingList({ ...opts, includeStaples: true })).map((i) => i.name)).toContain(
      "aceite de oliva",
    );
  });

  it("scales quantities to the number of people", () => {
    const list = flat(
      buildShoppingList({
        plan: plan(["2026-03-02", "lunch", "a"]),
        recipes: [mk("a", 2, ["300 g pasta".replace("pasta", "macarrones")])],
        dates,
        fridge: [],
        people: 4,
      }),
    );
    expect(list[0].qty).toBe(600);
  });

  it("scales each day by its own headcount override, not just the default", () => {
    const list = flat(
      buildShoppingList({
        plan: plan(["2026-03-02", "lunch", "a"], ["2026-03-03", "lunch", "a"]),
        recipes: [mk("a", 2, ["100 g arroz"])],
        dates,
        fridge: [],
        people: 2, // default for days without an override
        peopleByDay: { "2026-03-02": 4 }, // day 1 cooks for 4, day 2 uses the default (2)
      }),
    );
    // day 1: 100g * 4/2 = 200g, day 2: 100g * 2/2 = 100g -> merged = 300g
    expect(list[0].qty).toBe(300);
  });

  it("groups by supermarket section in aisle order", () => {
    const sections = buildShoppingList({
      plan: plan(["2026-03-02", "lunch", "a"]),
      recipes: [mk("a", 1, ["1 u salmón", "1 u tomate", "1 u huevo", "1 u pan"])],
      dates,
      fridge: [],
    });
    expect(sections.map((s) => s.section)).toEqual(["produce", "fish", "dairy", "bakery"]);
  });
});

describe("buildShoppingList: fridge subtraction", () => {
  const base = {
    plan: plan(["2026-03-02", "lunch", "a"]),
    recipes: [mk("a", 1, ["400 g patata", "2 u huevo", "1 u cebolla"])],
    dates,
  };

  it("removes ingredients that are in the fridge without quantity", () => {
    const names = flat(
      buildShoppingList({ ...base, fridge: [{ name: "huevos" }, { name: "cebolla" }] }),
    ).map((i) => i.name);
    expect(names).toEqual(["patata"]);
  });

  it("subtracts known quantities and converts units", () => {
    const list = flat(
      buildShoppingList({ ...base, fridge: [{ name: "patata", qty: 0.25, unit: "kg" }] }),
    );
    expect(list.find((i) => i.name === "patata")?.qty).toBe(150);
  });

  it("removes the item when the fridge covers all of it", () => {
    const list = flat(
      buildShoppingList({ ...base, fridge: [{ name: "patata", qty: 1, unit: "kg" }] }),
    );
    expect(list.find((i) => i.name === "patata")).toBeUndefined();
  });

  it("keeps the item when units are not comparable", () => {
    const list = flat(
      buildShoppingList({ ...base, fridge: [{ name: "patata", qty: 3, unit: "u" }] }),
    );
    expect(list.find((i) => i.name === "patata")?.qty).toBe(400);
  });

  it("does not let a catalog item satisfy a different one (tomate vs tomate frito)", () => {
    const r = mk("t", 1, ["200 g tomate frito"]);
    const list = flat(
      buildShoppingList({
        plan: plan(["2026-03-02", "lunch", "t"]),
        recipes: [r],
        dates,
        fridge: [{ name: "tomate" }],
      }),
    );
    expect(list).toHaveLength(1);
  });
});

describe("shoppingToText", () => {
  it("renders sections, checkmarks and quantities", () => {
    const list = buildShoppingList({
      plan: plan(["2026-03-02", "lunch", "a"]),
      recipes: [mk("a", 1, ["1500 g patata", "2 u huevo"])],
      dates,
      fridge: [],
    });
    const key = list.flatMap((s) => s.items).find((i) => i.name === "huevo")!.key;
    const text = shoppingToText(list, (s) => s, { checked: { [key]: true }, title: "Compra" });
    expect(text).toContain("Compra");
    expect(text).toContain("PRODUCE");
    expect(text).toContain("[ ] patata (1,5 kg)");
    expect(text).toContain("[x] huevo (2)");
  });
});
