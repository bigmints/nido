import type { Recipe, FridgeItem } from "../recipes/types";
import type { Plan } from "../shopping/build";
import type { OutfitCalendar } from "../outfits/calendar";
import type { Outfit, WardrobeItem } from "../outfits/types";
import type { PeopleByDay } from "../people";
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

/** Segovia is the default place until the user picks another one. */
export const DEFAULT_CITY: City = { name: "Segovia", lat: 40.9429, lon: -4.1088 };

export interface AppData {
  fridge: FridgeItem[];
  plan: Plan;
  /** headcount overrides per day; other days use `settings.people` */
  peopleByDay: PeopleByDay;
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
  city: DEFAULT_CITY,
  units: "metric",
  theme: "system",
  avoidRepeatDays: 5,
  people: 2,
};

export function defaultData(): AppData {
  return {
    fridge: [],
    plan: {},
    peopleByDay: {},
    checked: {},
    wardrobe: [],
    outfits: [],
    outfitCalendar: {},
    customRecipes: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

export const DATA_KEYS = Object.keys(defaultData()) as (keyof AppData)[];
