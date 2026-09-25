"use client";

import { useRef, useState } from "react";
import { addDays, fromISO, startOfWeek, todayISO, weekDates } from "@/lib/dates";
import { dateLocale } from "@/lib/i18n";
import { ingredientMatches } from "@/lib/recipes/catalog";
import { MEAL_SLOTS, type MealSlot, type Recipe } from "@/lib/recipes/types";
import { planKey } from "@/lib/shopping/build";
import { cap } from "@/lib/text";
import { formatQty } from "@/lib/shopping/units";
import { compressImage } from "@/lib/storage/image";
import { useApp } from "../AppProvider";
import { RecipeArt, usePhoto } from "../art";
import { Icon, Sheet } from "../ui";
import { DietBadges } from "./RecipeCard";

export function RecipeDetail({ recipe, onClose }: { recipe: Recipe | null; onClose: () => void }) {
  const { t, lang, data, update, putPhoto, removePhoto, toast } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [day, setDay] = useState(todayISO());
  const [slot, setSlot] = useState<MealSlot>("lunch");
  const photo = usePhoto(recipe ? `recipe:${recipe.id}` : undefined);

  if (!recipe) return null;

  const days = [
    ...weekDates(startOfWeek(todayISO())),
    ...weekDates(addDays(startOfWeek(todayISO()), 7)),
  ];
  const fmt = (iso: string) =>
    fromISO(iso).toLocaleDateString(dateLocale(lang), {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  const scale = data.settings.people / recipe.servings;
  const imperial = data.settings.units === "imperial";

  const onFile = async (file?: File) => {
    if (!file) return;
    try {
      await putPhoto(`recipe:${recipe.id}`, await compressImage(file, 900, 0.8));
      toast(t("photo.saved"));
    } catch {
      toast(t("photo.error"));
    }
  };

  return (
    <Sheet open onClose={onClose} title={recipe.name} wide>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,260px)_1fr]">
        <div>
          <RecipeArt recipe={recipe} className="aspect-[4/3] w-full rounded-2xl" />
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label={t("recipe.attach")}
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
            <button
              className="btn btn-soft !min-h-[36px] !text-xs"
              onClick={() => fileRef.current?.click()}
            >
              <Icon name="camera" className="h-4 w-4" />{" "}
              {photo ? t("recipe.changePhoto") : t("recipe.attach")}
            </button>
            {photo && (
              <button
                className="btn btn-outline !min-h-[36px] !text-xs"
                onClick={() =>
                  void removePhoto(`recipe:${recipe.id}`).then(() => toast(t("photo.removed")))
                }
              >
                {t("recipe.removePhoto")}
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-muted">{t("photo.local")}</p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-sm text-muted">
            <span className="inline-flex items-center gap-1">
              <Icon name="clock" className="h-4 w-4" /> {recipe.time} min
            </span>
            <span>·</span>
            <span>{t(`diff.${recipe.difficulty}`)}</span>
            <span>·</span>
            <span>{t("recipe.servings", { n: data.settings.people })}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <DietBadges recipe={recipe} />
          </div>
        </div>

        <div className="space-y-5">
          <section>
            <h3 className="mb-2 text-lg font-semibold">{t("recipe.ingredients")}</h3>
            <ul className="space-y-1.5 text-sm">
              {recipe.ingredients.map((i) => {
                const have = data.fridge.some((f) => ingredientMatches(f.name, i.name));
                return (
                  <li
                    key={i.name + i.unit}
                    className="flex items-center justify-between gap-3 rounded-lg bg-surface2/60 px-3 py-1.5"
                  >
                    <span>
                      {have && (
                        <span className="mr-1.5 text-sage" aria-label={t("recipe.inFridge")}>
                          ✅
                        </span>
                      )}
                      {cap(i.name)}
                    </span>
                    <span className="text-muted">{formatQty(i.qty * scale, i.unit, imperial)}</span>
                  </li>
                );
              })}
            </ul>
          </section>
          <section>
            <h3 className="mb-2 text-lg font-semibold">{t("recipe.steps")}</h3>
            <ol className="space-y-2 text-sm">
              {recipe.steps.map((s, idx) => (
                <li key={s} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose text-xs font-bold">
                    {idx + 1}
                  </span>
                  <span className="pt-0.5">{s}</span>
                </li>
              ))}
            </ol>
          </section>
          <section className="rounded-2xl bg-butter/60 p-3.5">
            <h3 className="mb-2 text-sm font-semibold">{t("recipe.addToPlan")}</h3>
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label className="label" htmlFor="plan-day">
                  {t("recipe.day")}
                </label>
                <select
                  id="plan-day"
                  className="input !w-auto"
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                >
                  {days.map((d) => (
                    <option key={d} value={d}>
                      {fmt(d)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="plan-slot">
                  {t("recipe.meal")}
                </label>
                <select
                  id="plan-slot"
                  className="input !w-auto"
                  value={slot}
                  onChange={(e) => setSlot(e.target.value as MealSlot)}
                >
                  {MEAL_SLOTS.map((s) => (
                    <option key={s} value={s}>
                      {t(`meal.${s}`)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => {
                  update("plan", (p) => ({ ...p, [planKey(day, slot)]: recipe.id }));
                  toast(t("planner.added"));
                }}
              >
                <Icon name="calendar" className="h-4 w-4" /> {t("common.add")}
              </button>
            </div>
          </section>
          {recipe.custom && (
            <button
              className="btn btn-danger"
              onClick={() => {
                update("customRecipes", (l) => l.filter((r) => r.id !== recipe.id));
                onClose();
              }}
            >
              <Icon name="trash" className="h-4 w-4" /> {t("common.delete")}
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
