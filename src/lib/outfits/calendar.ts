import { addDays, daysBetween } from "../dates";
import type { Outfit } from "./types";

/** date -> outfit id */
export type OutfitCalendar = Record<string, string>;

/** Ids of outfits worn in the `days` days before `date` (exclusive). */
export function recentOutfitIds(cal: OutfitCalendar, date: string, days: number): Set<string> {
  const out = new Set<string>();
  for (const [d, id] of Object.entries(cal)) {
    const diff = daysBetween(d, date);
    if (diff > 0 && diff <= days) out.add(id);
  }
  return out;
}

/** Item ids used by outfits worn recently. */
export function recentItemIds(
  cal: OutfitCalendar,
  outfits: Outfit[],
  date: string,
  days: number,
): string[] {
  const ids = recentOutfitIds(cal, date, days);
  return outfits.filter((o) => ids.has(o.id)).flatMap((o) => o.itemIds);
}

/**
 * Returns the conflicting date if assigning `outfitId` to `date` repeats the same outfit
 * within `minGap` days (looks backwards and forwards, since users plan ahead), else null.
 */
export function repeatsWithin(
  cal: OutfitCalendar,
  date: string,
  outfitId: string,
  minGap: number,
): string | null {
  for (let i = 1; i <= minGap; i++) {
    for (const d of [addDays(date, -i), addDays(date, i)]) {
      if (cal[d] === outfitId) return d;
    }
  }
  return null;
}

/** Saved outfits that would not repeat within `minGap` days, longest-unworn first. */
export function availableOutfits(
  outfits: Outfit[],
  cal: OutfitCalendar,
  date: string,
  minGap: number,
): Outfit[] {
  const last = new Map<string, string>();
  for (const [d, id] of Object.entries(cal)) {
    if (d < date && (!last.has(id) || d > (last.get(id) as string))) last.set(id, d);
  }
  return outfits
    .filter((o) => repeatsWithin(cal, date, o.id, minGap) === null)
    .sort(
      (a, b) =>
        (last.get(a.id) ?? "").localeCompare(last.get(b.id) ?? "") || a.name.localeCompare(b.name),
    );
}
