import type { Category, WardrobeItem } from "./types";

/** One garment per category; a dress replaces top + bottom. */
export type Slots = Partial<Record<Category, string>>;

export function placeItem(slots: Slots, item: Pick<WardrobeItem, "id" | "category">): Slots {
  const next: Slots = { ...slots, [item.category]: item.id };
  if (item.category === "dress") {
    delete next.top;
    delete next.bottom;
  } else if (item.category === "top" || item.category === "bottom") {
    delete next.dress;
  }
  return next;
}

export function removeSlot(slots: Slots, category: Category): Slots {
  const next = { ...slots };
  delete next[category];
  return next;
}

const ORDER: Category[] = ["outerwear", "dress", "top", "bottom", "shoes", "accessory"];

export function slotsToIds(slots: Slots): string[] {
  return ORDER.map((c) => slots[c]).filter((x): x is string => !!x);
}

/** Rebuild slots from a saved outfit, ignoring items that no longer exist. */
export function idsToSlots(ids: string[], wardrobe: WardrobeItem[]): Slots {
  let slots: Slots = {};
  for (const id of ids) {
    const item = wardrobe.find((w) => w.id === id);
    if (item) slots = placeItem(slots, item);
  }
  return slots;
}

/** An outfit is complete when it has a dress or top + bottom. */
export function isComplete(slots: Slots): boolean {
  return !!slots.dress || (!!slots.top && !!slots.bottom);
}
