export type Category = "top" | "bottom" | "dress" | "outerwear" | "shoes" | "accessory";
export const CATEGORIES: Category[] = ["top", "bottom", "dress", "outerwear", "shoes", "accessory"];
export type Formality = "casual" | "smart" | "formal";
export type Occasion = "casual" | "work" | "party" | "sport";
export const OCCASIONS: Occasion[] = ["casual", "work", "party", "sport"];
export type Season = "spring" | "summer" | "autumn" | "winter";
export const SEASONS: Season[] = ["spring", "summer", "autumn", "winter"];

/** Recognised tags (free-form tags are allowed too). */
export const TAG_SPORT = "deporte";
export const TAG_WATERPROOF = "impermeable";
export const TAG_OPEN = "abierto";

export interface WardrobeItem {
  id: string;
  name: string;
  category: Category;
  /** color ids, first one is the primary color */
  colors: string[];
  /** 1 (very light) .. 5 (very warm) */
  warmth: 1 | 2 | 3 | 4 | 5;
  formality: Formality;
  seasons: Season[];
  tags: string[];
  /** id of a user photo stored in the photos store; absent -> generated illustration */
  photoId?: string;
}

export interface Outfit {
  id: string;
  name: string;
  itemIds: string[];
  occasion?: Occasion;
  createdAt: number;
}

export interface WeatherInput {
  /** feels-like temperature in Celsius */
  tempC: number;
  rain: boolean;
}

export type ReasonCode =
  | "warmthPerfect"
  | "warmthLayered"
  | "warmthLight"
  | "rainCoat"
  | "neutralPalette"
  | "harmony"
  | "formalityMatch"
  | "sportGear"
  | "partyDress"
  | "fresh";

export interface Suggestion {
  itemIds: string[];
  score: number;
  reasons: ReasonCode[];
}
