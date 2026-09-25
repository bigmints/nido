"use client";

import type { RankedRecipe, Recipe } from "@/lib/recipes/types";
import { useApp } from "../AppProvider";
import { RecipeArt } from "../art";
import { Icon } from "../ui";

export function DietBadges({ recipe }: { recipe: Recipe }) {
  const { t } = useApp();
  const marks: [string, string][] = [];
  if (recipe.diet.includes("vegano")) marks.push(["🌱", t("diet.vegano")]);
  else if (recipe.diet.includes("vegetariano")) marks.push(["🥕", t("diet.vegetariano")]);
  if (recipe.diet.includes("sin-gluten")) marks.push(["🌾", t("diet.sin-gluten")]);
  return (
    <>
      {marks.map(([e, label]) => (
        <span key={label} className="chip !px-2 !py-0.5" title={label}>
          <span aria-hidden="true">{e}</span>
          <span className="sr-only sm:not-sr-only">{label}</span>
        </span>
      ))}
    </>
  );
}

export function RecipeCard({
  recipe,
  ranked,
  onOpen,
}: {
  recipe: Recipe;
  ranked?: RankedRecipe;
  onOpen: (r: Recipe) => void;
}) {
  const { t } = useApp();
  const total = ranked ? ranked.have.length + ranked.missing.length : 0;
  return (
    <button
      onClick={() => onOpen(recipe)}
      className="card group animate-rise flex flex-col overflow-hidden text-left transition hover:-translate-y-0.5 hover:shadow-lift"
    >
      <RecipeArt recipe={recipe} className="h-28 w-full" />
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <h3 className="text-lg font-semibold leading-snug">{recipe.name}</h3>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <Icon name="clock" className="h-3.5 w-3.5" /> {recipe.time} min
          </span>
          <span>·</span>
          <span>{t(`diff.${recipe.difficulty}`)}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          <DietBadges recipe={recipe} />
        </div>
        {ranked && (
          <div className="mt-auto pt-1">
            <div className="mb-1 flex justify-between text-xs font-semibold">
              <span>{t("fridge.match", { have: ranked.have.length, total })}</span>
              <span className="text-muted">{Math.round(ranked.ratio * 100)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface2" aria-hidden="true">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${ranked.ratio * 100}%` }}
              />
            </div>
            {ranked.missing.length > 0 && (
              <p className="mt-2 text-xs text-muted">
                {t("fridge.missing")}: {ranked.missing.slice(0, 4).join(", ")}
                {ranked.missing.length > 4 ? "…" : ""}
              </p>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
