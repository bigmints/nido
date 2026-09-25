"use client";

import { useMemo, useState } from "react";
import { canon } from "@/lib/recipes/catalog";
import { MEAL_SLOTS, type Diet, type MealSlot, type Recipe } from "@/lib/recipes/types";
import { useApp } from "../AppProvider";
import { EmptyState, Icon } from "../ui";
import { RecipeCard } from "./RecipeCard";

export function RecipeBrowser({ onOpen }: { onOpen: (r: Recipe) => void }) {
  const { t, recipes } = useApp();
  const [q, setQ] = useState("");
  const [meal, setMeal] = useState<MealSlot | "all">("all");
  const [diets, setDiets] = useState<Diet[]>([]);

  const list = useMemo(() => {
    const nq = canon(q);
    return recipes.filter(
      (r) =>
        (meal === "all" || r.meals.includes(meal)) &&
        diets.every((d) => r.diet.includes(d)) &&
        (!nq ||
          canon(r.name).includes(nq) ||
          r.ingredients.some((i) => canon(i.name).includes(nq))),
    );
  }, [recipes, q, meal, diets]);

  return (
    <div className="space-y-4">
      <div className="card flex flex-col gap-3 p-4">
        <div className="relative">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          />
          <label htmlFor="recipe-search" className="sr-only">
            {t("recipes.search")}
          </label>
          <input
            id="recipe-search"
            className="input !pl-9"
            placeholder={t("recipes.search")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("recipes.filters")}>
          {(["all", ...MEAL_SLOTS] as const).map((m) => (
            <button
              key={m}
              aria-pressed={meal === m}
              onClick={() => setMeal(m)}
              className={`chip ${meal === m ? "chip-on" : "hover:bg-surface2"}`}
            >
              {m === "all" ? t("common.all") : t(`meal.${m}`)}
            </button>
          ))}
          <span className="mx-1 w-px bg-line" aria-hidden="true" />
          {(["vegetariano", "vegano", "sin-gluten"] as Diet[]).map((d) => {
            const on = diets.includes(d);
            return (
              <button
                key={d}
                aria-pressed={on}
                onClick={() => setDiets((c) => (on ? c.filter((x) => x !== d) : [...c, d]))}
                className={`chip ${on ? "chip-on" : "hover:bg-surface2"}`}
              >
                {t(`diet.${d}`)}
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-sm text-muted">{t("recipes.count", { n: list.length })}</p>
      {list.length === 0 ? (
        <EmptyState emoji="🔎" title={t("recipes.none")} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((r) => (
            <RecipeCard key={r.id} recipe={r} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  );
}
