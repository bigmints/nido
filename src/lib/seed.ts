import { addDays, startOfWeek, weekDates } from "./dates";
import type { WardrobeItem, Outfit } from "./outfits/types";
import { planKey, type Plan } from "./shopping/build";
import type { AppData } from "./storage/schema";
import type { FridgeItem } from "./recipes/types";

type Cat = WardrobeItem["category"];
const w = (
  id: string,
  name: string,
  category: Cat,
  colors: string[],
  warmth: WardrobeItem["warmth"],
  formality: WardrobeItem["formality"],
  tags: string[] = [],
  seasons: WardrobeItem["seasons"] = ["spring", "autumn"],
): WardrobeItem => ({ id: `demo-${id}`, name, category, colors, warmth, formality, seasons, tags });

/** Demo wardrobe: generated illustrations only (no photos). */
export const DEMO_WARDROBE: WardrobeItem[] = [
  w(
    "camiseta-blanca",
    "Camiseta blanca básica",
    "top",
    ["blanco"],
    1,
    "casual",
    [],
    ["spring", "summer"],
  ),
  w("camisa-celeste", "Camisa celeste", "top", ["celeste"], 2, "smart"),
  w(
    "jersey-crema",
    "Jersey de punto crema",
    "top",
    ["crema"],
    4,
    "casual",
    [],
    ["autumn", "winter"],
  ),
  w("top-rosa", "Top rosa pastel", "top", ["rosa"], 1, "casual", [], ["spring", "summer"]),
  w("blusa-negra", "Blusa negra de seda", "top", ["negro"], 2, "smart"),
  w("sudadera-gris", "Sudadera gris", "top", ["gris"], 4, "casual", [], ["autumn", "winter"]),
  w(
    "top-deporte",
    "Top deportivo lila",
    "top",
    ["lila"],
    1,
    "casual",
    ["deporte"],
    ["spring", "summer"],
  ),
  w("vaqueros", "Vaqueros rectos", "bottom", ["denim"], 3, "casual"),
  w("falda-plisada", "Falda plisada beige", "bottom", ["beige"], 2, "smart"),
  w("pantalon-negro", "Pantalón de vestir negro", "bottom", ["negro"], 3, "smart"),
  w("shorts", "Shorts vaqueros", "bottom", ["denim"], 1, "casual", [], ["summer"]),
  w("leggings", "Leggings negros", "bottom", ["negro"], 2, "casual", ["deporte"]),
  w(
    "vestido-floral",
    "Vestido rosa de verano",
    "dress",
    ["rosa"],
    1,
    "smart",
    [],
    ["spring", "summer"],
  ),
  w("vestido-negro", "Vestido negro de fiesta", "dress", ["negro"], 2, "formal"),
  w("chaqueta-vaquera", "Chaqueta vaquera", "outerwear", ["denim"], 3, "casual"),
  w("abrigo-camel", "Abrigo camel", "outerwear", ["beige"], 5, "smart", [], ["winter"]),
  w("impermeable", "Impermeable amarillo", "outerwear", ["amarillo"], 2, "casual", ["impermeable"]),
  w("blazer-negro", "Blazer negro", "outerwear", ["negro"], 3, "smart"),
  w("zapatillas", "Zapatillas blancas", "shoes", ["blanco"], 2, "casual"),
  w("botines", "Botines marrones", "shoes", ["marron"], 3, "smart", [], ["autumn", "winter"]),
  w("sandalias", "Sandalias beige", "shoes", ["beige"], 1, "casual", ["abierto"], ["summer"]),
  w("running", "Zapatillas de running", "shoes", ["lila"], 2, "casual", ["deporte"]),
  w("tacones", "Tacones negros", "shoes", ["negro"], 2, "formal"),
  w("bolso", "Bolso crema", "accessory", ["crema"], 1, "smart"),
  w("bufanda", "Bufanda burdeos", "accessory", ["burdeos"], 3, "casual", [], ["winter"]),
];

export const DEMO_OUTFITS: Outfit[] = [
  {
    id: "demo-outfit-paseo",
    name: "Paseo de domingo",
    itemIds: ["demo-camiseta-blanca", "demo-vaqueros", "demo-zapatillas", "demo-chaqueta-vaquera"],
    occasion: "casual",
    createdAt: 1,
  },
  {
    id: "demo-outfit-oficina",
    name: "Oficina con estilo",
    itemIds: ["demo-camisa-celeste", "demo-pantalon-negro", "demo-botines", "demo-blazer-negro"],
    occasion: "work",
    createdAt: 2,
  },
  {
    id: "demo-outfit-cena",
    name: "Cena bonita",
    itemIds: ["demo-vestido-negro", "demo-tacones", "demo-bolso"],
    occasion: "party",
    createdAt: 3,
  },
  {
    id: "demo-outfit-cozy",
    name: "Día de manta y café",
    itemIds: ["demo-jersey-crema", "demo-vaqueros", "demo-zapatillas", "demo-bufanda"],
    occasion: "casual",
    createdAt: 4,
  },
];

export const DEMO_FRIDGE: FridgeItem[] = [
  "huevo",
  "tomate",
  "cebolla",
  "patata",
  "espinacas",
  "queso rallado",
  "aguacate",
].map((name) => ({ name }));

const WEEK: [string, string, string][] = [
  ["porridge-manzana", "lentejas-estofadas", "salmon-horno"],
  ["tostada-aguacate", "pasta-tomate", "tortilla-espinacas"],
  ["yogur-granola", "arroz-pollo", "crema-calabaza"],
  ["tortitas-platano", "garbanzos-espinacas", "pizza-margarita"],
  ["huevos-revueltos", "ensalada-mediterranea", "pollo-curry"],
  ["crepes-dulces", "tortilla-patata", "poke-salmon"],
  ["bizcocho-yogur", "albondigas-tomate", "hamburguesa-casera"],
];

/** Demo plan for the week containing `today`. */
export function demoPlan(today: string): Plan {
  const plan: Plan = {};
  weekDates(startOfWeek(today)).forEach((date, i) => {
    const [b, l, d] = WEEK[i];
    plan[planKey(date, "breakfast")] = b;
    plan[planKey(date, "lunch")] = l;
    plan[planKey(date, "dinner")] = d;
  });
  return plan;
}

/** Everything needed to make the app look alive on first open. */
export function demoData(today: string): Partial<AppData> {
  return {
    fridge: DEMO_FRIDGE,
    plan: demoPlan(today),
    wardrobe: DEMO_WARDROBE,
    outfits: DEMO_OUTFITS,
    outfitCalendar: {
      [addDays(today, -3)]: "demo-outfit-oficina",
      [addDays(today, -1)]: "demo-outfit-paseo",
      [addDays(today, 1)]: "demo-outfit-cena",
    },
    checked: {},
  };
}
