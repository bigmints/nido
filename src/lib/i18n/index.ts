import { en } from "./en";
import { es } from "./es";
import type { Lang } from "../storage/schema";

export type TKey = keyof typeof es;
export type Vars = Record<string, string | number>;

const DICTS: Record<Lang, Record<TKey, string>> = { es, en };

/** Translate a key, interpolating {vars}. Falls back to Spanish, then to the key itself. */
export function translate(lang: Lang, key: TKey, vars?: Vars): string {
  const raw = DICTS[lang]?.[key] ?? es[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

export function dateLocale(lang: Lang): string {
  return lang === "es" ? "es-ES" : "en-GB";
}
