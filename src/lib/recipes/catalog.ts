import type { Section } from "./types";

export interface CatalogEntry {
  name: string;
  section: Section;
  meat?: boolean;
  fish?: boolean;
  animal?: boolean;
  gluten?: boolean;
  staple?: boolean;
  aliases?: string[];
}

type Row = [name: string, flags?: string, aliases?: string];

/** flags: m=meat f=fish a=animal-derived g=gluten s=staple (assumed at home) */
function section(s: Section, rows: Row[]): CatalogEntry[] {
  return rows.map(([name, flags = "", aliases]) => ({
    name,
    section: s,
    meat: flags.includes("m") || undefined,
    fish: flags.includes("f") || undefined,
    animal: flags.includes("a") || flags.includes("m") || flags.includes("f") || undefined,
    gluten: flags.includes("g") || undefined,
    staple: flags.includes("s") || undefined,
    aliases: aliases ? aliases.split("|") : undefined,
  }));
}

export const CATALOG: CatalogEntry[] = [
  ...section("produce", [
    ["tomate"],
    ["cebolla"],
    ["ajo"],
    ["patata", "", "papa"],
    ["zanahoria"],
    ["pimiento rojo"],
    ["pimiento verde"],
    ["calabacín", "", "zucchini"],
    ["berenjena"],
    ["champiñón", "", "seta|setas"],
    ["espinacas"],
    ["lechuga"],
    ["pepino"],
    ["aguacate", "", "palta"],
    ["limón"],
    ["naranja"],
    ["plátano", "", "banana"],
    ["manzana"],
    ["fresa"],
    ["arándano"],
    ["calabaza"],
    ["brócoli"],
    ["coliflor"],
    ["puerro"],
    ["apio"],
    ["cebolleta"],
    ["perejil"],
    ["cilantro"],
    ["albahaca"],
    ["menta"],
    ["jengibre"],
    ["boniato", "", "batata"],
    ["judía verde"],
    ["guisantes"],
    ["rúcula"],
    ["tomate cherry"],
    ["pera"],
    ["kiwi"],
    ["mango"],
    ["lima"],
    ["tofu"],
    ["remolacha"],
    ["col lombarda"],
  ]),
  ...section("meat", [
    ["pechuga de pollo", "m", "pollo"],
    ["muslo de pollo", "m"],
    ["carne picada", "m"],
    ["ternera", "m", "filete de ternera"],
    ["lomo de cerdo", "m", "cerdo"],
    ["chorizo", "m"],
    ["jamón serrano", "m", "jamon"],
    ["bacon", "m", "beicon|panceta"],
    ["salchichas", "m"],
    ["pechuga de pavo", "m", "pavo"],
  ]),
  ...section("fish", [
    ["salmón", "f"],
    ["merluza", "f"],
    ["atún en lata", "f", "atun"],
    ["gambas", "f"],
    ["bacalao", "f"],
    ["sardinas en lata", "f"],
    ["mejillones", "f"],
    ["calamar", "f"],
  ]),
  ...section("dairy", [
    ["huevo", "a"],
    ["leche", "a"],
    ["yogur natural", "a", "yogur"],
    ["queso rallado", "a"],
    ["queso fresco", "a"],
    ["mozzarella", "a"],
    ["queso feta", "a", "feta"],
    ["queso parmesano", "a", "parmesano"],
    ["mantequilla", "a"],
    ["nata", "a"],
    ["queso de cabra", "a"],
  ]),
  ...section("bakery", [
    ["pan", "g"],
    ["pan de molde", "g"],
    ["tortilla de trigo", "g", "wrap"],
    ["pan rallado", "g"],
    ["masa de pizza", "g"],
    ["pan de pita", "g"],
  ]),
  ...section("pantry", [
    ["arroz"],
    ["espaguetis", "g"],
    ["macarrones", "g"],
    ["lentejas"],
    ["garbanzos"],
    ["alubias blancas"],
    ["quinoa"],
    ["cuscús", "g"],
    ["avena", "g", "copos de avena"],
    ["harina de trigo", "g", "harina"],
    ["tomate frito"],
    ["tomate triturado"],
    ["caldo de verduras"],
    ["caldo de pollo", "m"],
    ["miel", "a"],
    ["mermelada"],
    ["crema de cacahuete", "", "mantequilla de cacahuete"],
    ["cacahuetes"],
    ["nueces"],
    ["almendras"],
    ["pasas"],
    ["chocolate negro"],
    ["cacao en polvo"],
    ["leche de coco"],
    ["salsa de soja", "g", "soja"],
    ["maíz dulce", "", "maiz"],
    ["aceitunas"],
    ["tahini"],
    ["semillas de chía", "", "chía"],
    ["granola", "g"],
    ["bebida de avena", "g"],
    ["mostaza"],
    ["mayonesa", "a"],
    ["pimientos del piquillo"],
    ["levadura química", "g"],
    ["fideos", "g"],
    ["pasta de curry"],
  ]),
  ...section("basics", [
    ["sal", "s"],
    ["pimienta", "s"],
    ["pimentón", "s"],
    ["comino", "s"],
    ["orégano", "s"],
    ["canela", "s"],
    ["curry en polvo", "s"],
    ["cúrcuma", "s"],
    ["aceite de oliva", "s"],
    ["vinagre", "s"],
    ["agua", "s"],
    ["azúcar", "s"],
    ["tomillo", "s"],
    ["laurel", "s"],
    ["nuez moscada", "s"],
  ]),
];

const SUFFIX_RULES = /(?<=[lrndz])es$/;

function singularWord(w: string): string {
  if (w.length <= 3) return w;
  if (w.endsWith("ces")) return w.slice(0, -3) + "z";
  if (SUFFIX_RULES.test(w)) return w.slice(0, -2);
  if (w.endsWith("s")) return w.slice(0, -1);
  return w;
}

/** Lowercase, strip accents, collapse spaces and singularise every word. */
export function canon(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(singularWord)
    .join(" ");
}

const byCanon = new Map<string, CatalogEntry>();
for (const e of CATALOG) {
  byCanon.set(canon(e.name), e);
  for (const a of e.aliases ?? []) byCanon.set(canon(a), e);
}

/** Look a free-text name up in the catalog (exact, plural-insensitive, alias aware). */
export function findCatalog(name: string): CatalogEntry | undefined {
  return byCanon.get(canon(name));
}

/** True when a fridge item satisfies a recipe ingredient. */
export function ingredientMatches(fridgeName: string, ingredientName: string): boolean {
  const f = canon(fridgeName);
  const i = canon(ingredientName);
  if (!f || !i) return false;
  if (f === i) return true;
  const fe = byCanon.get(f);
  const ie = byCanon.get(i);
  if (fe && ie) return fe === ie;
  if (fe) return false; // known exact ingredient: no fuzzy matching
  // free text such as "pollo" or "queso": whole-word containment
  const words = i.split(" ");
  const fw = f.split(" ");
  return fw.every((w) => words.includes(w));
}

/** Names suggested by the autocomplete. */
export function catalogNames(): string[] {
  return CATALOG.filter((e) => !e.staple)
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, "es"));
}
