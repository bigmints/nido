import type { Recipe, FridgeItem } from "../recipes/types";
import type { Plan } from "../shopping/build";
import type { OutfitCalendar } from "../outfits/calendar";
import type { Outfit, WardrobeItem } from "../outfits/types";
import type { City } from "../weather";

export type Lang = "es" | "en";

export interface Settings {
  lang: Lang;
  city: City | null;
  units: "metric" | "imperial";
  theme: "system" | "light" | "dark";
  /** do not repeat the same outfit within N days */
  avoidRepeatDays: number;
  /** people to cook for (recipes are scaled) */
  people: number;
}

export interface AppData {
  fridge: FridgeItem[];
  plan: Plan;
  /** shopping items ticked off */
  checked: Record<string, boolean>;
  wardrobe: WardrobeItem[];
  outfits: Outfit[];
  outfitCalendar: OutfitCalendar;
  customRecipes: Recipe[];
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  lang: "es",
  city: null,
  units: "metric",
  theme: "system",
  avoidRepeatDays: 5,
  people: 2,
};

export function defaultData(): AppData {
  return {
    fridge: [],
    plan: {},
    checked: {},
    wardrobe: [],
    outfits: [],
    outfitCalendar: {},
    customRecipes: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

export const DATA_KEYS = Object.keys(defaultData()) as (keyof AppData)[];
