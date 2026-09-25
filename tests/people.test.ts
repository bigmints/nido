import { describe, expect, it } from "vitest";
import { clampPeople, peopleFor, withPeople } from "@/lib/people";

describe("peopleFor", () => {
  it("falls back to the default when the day has no override", () => {
    expect(peopleFor({}, 2, "2026-03-02")).toBe(2);
    expect(peopleFor(undefined, 3, "2026-03-02")).toBe(3);
  });

  it("uses the day's own value when set", () => {
    expect(peopleFor({ "2026-03-02": 5 }, 2, "2026-03-02")).toBe(5);
  });

  it("ignores an out-of-range or non-finite override", () => {
    expect(peopleFor({ "2026-03-02": 0 }, 2, "2026-03-02")).toBe(2);
    expect(peopleFor({ "2026-03-02": 99 }, 2, "2026-03-02")).toBe(2);
    expect(peopleFor({ "2026-03-02": NaN }, 2, "2026-03-02")).toBe(2);
  });
});

describe("clampPeople", () => {
  it("clamps to [1, 12] and rounds", () => {
    expect(clampPeople(0)).toBe(1);
    expect(clampPeople(20)).toBe(12);
    expect(clampPeople(3.6)).toBe(4);
  });
});

describe("withPeople", () => {
  it("sets an override that differs from the default", () => {
    expect(withPeople({}, "2026-03-02", 5, 2)).toEqual({ "2026-03-02": 5 });
  });

  it("removes the override when set back to the default", () => {
    const start = { "2026-03-02": 5, "2026-03-03": 4 };
    expect(withPeople(start, "2026-03-02", 2, 2)).toEqual({ "2026-03-03": 4 });
  });

  it("does not mutate the input", () => {
    const start = { "2026-03-02": 5 };
    withPeople(start, "2026-03-02", 3, 2);
    expect(start).toEqual({ "2026-03-02": 5 });
  });
});
