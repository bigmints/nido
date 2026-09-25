export const MIN_PEOPLE = 1;
export const MAX_PEOPLE = 12;

/** date (YYYY-MM-DD) -> how many people eat that day; days not listed use the default. */
export type PeopleByDay = Record<string, number>;

export const clampPeople = (n: number): number =>
  Math.min(MAX_PEOPLE, Math.max(MIN_PEOPLE, Math.round(n)));

/** People to cook for on `date`: the day's own number if set and valid, else `fallback`. */
export function peopleFor(byDay: PeopleByDay | undefined, fallback: number, date: string): number {
  const n = byDay?.[date];
  return typeof n === "number" && Number.isFinite(n) && n >= MIN_PEOPLE && n <= MAX_PEOPLE
    ? Math.round(n)
    : fallback;
}

/** Set a day's headcount; setting it back to the default removes the override. */
export function withPeople(
  byDay: PeopleByDay,
  date: string,
  n: number,
  fallback: number,
): PeopleByDay {
  const next = { ...byDay };
  const v = clampPeople(n);
  if (v === fallback) delete next[date];
  else next[date] = v;
  return next;
}
