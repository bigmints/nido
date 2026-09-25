"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useMemo, useState } from "react";
import { addDays, fromISO, todayISO, weekDates } from "@/lib/dates";
import { dateLocale } from "@/lib/i18n";
import { peopleFor, withPeople } from "@/lib/people";
import { canon } from "@/lib/recipes/catalog";
import { rankRecipes } from "@/lib/recipes/match";
import { MEAL_SLOTS, type MealSlot, type Recipe } from "@/lib/recipes/types";
import { planKey } from "@/lib/shopping/build";
import { useApp } from "../AppProvider";
import { RecipeArt } from "../art";
import { PeopleStepper } from "../PeopleStepper";
import { Icon, Sheet } from "../ui";

function MiniRecipe({ recipe, dragging = false }: { recipe: Recipe; dragging?: boolean }) {
  return (
    <div
      className={`flex w-40 shrink-0 items-center gap-2 rounded-xl border border-line bg-surface p-1.5 pr-2.5 shadow-soft ${
        dragging ? "rotate-2 shadow-lift" : ""
      }`}
    >
      <RecipeArt recipe={recipe} className="h-10 w-10 shrink-0 rounded-lg [&>span]:text-xl" />
      <span className="line-clamp-2 text-xs font-semibold leading-tight">{recipe.name}</span>
    </div>
  );
}

function PaletteItem({ recipe, onOpen }: { recipe: Recipe; onOpen: (r: Recipe) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${recipe.id}`,
    data: { recipeId: recipe.id },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onDoubleClick={() => onOpen(recipe)}
      className={`touch-manipulation cursor-grab ${isDragging ? "opacity-40" : ""}`}
    >
      <MiniRecipe recipe={recipe} />
    </div>
  );
}

function Slot({
  date,
  slot,
  recipe,
  onPick,
  onClear,
  onOpen,
}: {
  date: string;
  slot: MealSlot;
  recipe?: Recipe;
  onPick: () => void;
  onClear: () => void;
  onOpen: (r: Recipe) => void;
}) {
  const { t } = useApp();
  const key = planKey(date, slot);
  const { setNodeRef, isOver } = useDroppable({ id: key });
  const drag = useDraggable({
    id: `slot:${key}`,
    data: { recipeId: recipe?.id, from: key },
    disabled: !recipe,
  });

  return (
    <div
      ref={setNodeRef}
      data-testid={`slot-${key}`}
      className={`relative min-h-[84px] rounded-xl border-2 border-dashed p-1.5 transition ${
        isOver
          ? "border-accent bg-rose"
          : recipe
            ? "border-transparent bg-surface2/70"
            : "border-line"
      }`}
    >
      <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
        {t(`meal.${slot}`)}
      </div>
      {recipe ? (
        <div
          ref={drag.setNodeRef}
          {...drag.listeners}
          {...drag.attributes}
          className={`touch-manipulation cursor-grab ${drag.isDragging ? "opacity-30" : ""}`}
        >
          <button
            onClick={() => onOpen(recipe)}
            className="flex w-full flex-col items-start gap-0.5 text-left"
            aria-label={recipe.name}
          >
            <span className="text-xl" aria-hidden="true">
              {recipe.emoji}
            </span>
            <span className="line-clamp-2 text-xs font-semibold leading-tight">{recipe.name}</span>
          </button>
          <button
            onClick={onClear}
            aria-label={`${t("common.remove")} ${recipe.name}`}
            className="absolute right-1 top-1 rounded-full p-1 text-muted hover:bg-surface hover:text-ink"
          >
            <Icon name="x" className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={onPick}
          className="flex h-[52px] w-full items-center justify-center rounded-lg text-muted transition hover:bg-surface2 hover:text-ink"
          aria-label={`${t("planner.choose")} — ${t(`meal.${slot}`)}`}
        >
          <Icon name="plus" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function Planner({
  weekStart,
  setWeekStart,
  onOpen,
}: {
  weekStart: string;
  setWeekStart: (s: string) => void;
  onOpen: (r: Recipe) => void;
}) {
  const { t, lang, data, update, recipes, recipeById, toast } = useApp();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [picker, setPicker] = useState<{ date: string; slot: MealSlot } | null>(null);
  const [q, setQ] = useState("");
  const dates = weekDates(weekStart);
  const today = todayISO();

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const fridgeNames = data.fridge.map((f) => f.name);
  const palette = useMemo(() => {
    const ranked = rankRecipes(recipes, fridgeNames).map((r) => r.recipe);
    const rest = recipes.filter((r) => !ranked.includes(r));
    const all = [...ranked, ...rest];
    const nq = canon(q);
    return (nq ? all.filter((r) => canon(r.name).includes(nq)) : all).slice(0, 40);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipes, data.fridge, q]);

  const pickerList = useMemo(() => {
    if (!picker) return [];
    const nq = canon(q);
    const base = recipes.filter((r) => r.meals.includes(picker.slot));
    return (nq ? base.filter((r) => canon(r.name).includes(nq)) : base).slice(0, 60);
  }, [recipes, picker, q]);

  const activeRecipeId = activeId
    ? ((activeId.startsWith("palette:") ? activeId.slice(8) : data.plan[activeId.slice(5)]) as
        string | undefined)
    : undefined;
  const activeRecipe = activeRecipeId ? recipeById(activeRecipeId) : undefined;

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const overId = e.over?.id;
    if (!overId) return;
    const target = String(overId);
    const recipeId = e.active.data.current?.recipeId as string | undefined;
    const from = e.active.data.current?.from as string | undefined;
    if (!recipeId || target === from) return;
    update("plan", (p) => {
      const next = { ...p };
      const displaced = next[target];
      next[target] = recipeId;
      if (from) {
        if (displaced)
          next[from] = displaced; // swap
        else delete next[from];
      }
      return next;
    });
  };

  const fmtDay = (iso: string) =>
    fromISO(iso).toLocaleDateString(dateLocale(lang), { weekday: "short" });
  const fmtDate = (iso: string) =>
    fromISO(iso).toLocaleDateString(dateLocale(lang), { day: "numeric", month: "short" });
  const first = fromISO(dates[0]).toLocaleDateString(dateLocale(lang), {
    day: "numeric",
    month: "long",
  });
  const last = fromISO(dates[6]).toLocaleDateString(dateLocale(lang), {
    day: "numeric",
    month: "long",
  });

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            className="btn btn-outline !px-2.5"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            aria-label={t("planner.prev")}
          >
            <Icon name="chevronL" className="h-4 w-4" />
          </button>
          <button
            className="btn btn-outline !px-2.5"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            aria-label={t("planner.next")}
          >
            <Icon name="chevronR" className="h-4 w-4" />
          </button>
          <button
            className="btn btn-soft"
            onClick={() => setWeekStart(addDays(today, -((fromISO(today).getDay() + 6) % 7)))}
          >
            {t("planner.thisWeek")}
          </button>
        </div>
        <h2 className="text-lg font-semibold">
          {first} – {last}
        </h2>
      </div>

      <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-line bg-bg/90 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:rounded-2xl lg:border lg:bg-surface/80 lg:px-3">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-muted">{t("planner.dragHint")}</span>
          <label className="sr-only" htmlFor="palette-search">
            {t("recipes.search")}
          </label>
          <input
            id="palette-search"
            className="input !min-h-[34px] !w-40 !py-1 text-xs"
            placeholder={t("recipes.search")}
            value={picker ? "" : q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1" data-testid="palette">
          {palette.map((r) => (
            <PaletteItem key={r.id} recipe={r} onOpen={onOpen} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-7 lg:gap-2">
        {dates.map((d) => (
          <section
            key={d}
            aria-label={`${fmtDay(d)} ${fmtDate(d)}`}
            className={`card p-2.5 ${d === today ? "ring-2 ring-accent" : ""}`}
          >
            <header className="mb-2 flex items-baseline justify-between px-0.5 lg:block">
              <h3 className="text-base font-semibold capitalize">{fmtDay(d)}</h3>
              <span className="text-xs text-muted">{fmtDate(d)}</span>
              <div className="mt-1.5">
                <PeopleStepper
                  compact
                  label={`${t("people.forDay")}: ${fmtDay(d)} ${fmtDate(d)}`}
                  value={peopleFor(data.peopleByDay, data.settings.people, d)}
                  onChange={(n) =>
                    update("peopleByDay", (p) => withPeople(p, d, n, data.settings.people))
                  }
                />
              </div>
            </header>
            <div className="grid grid-cols-3 gap-1.5 lg:grid-cols-1">
              {MEAL_SLOTS.map((s) => {
                const rid = data.plan[planKey(d, s)];
                return (
                  <Slot
                    key={s}
                    date={d}
                    slot={s}
                    recipe={rid ? recipeById(rid) : undefined}
                    onOpen={onOpen}
                    onPick={() => {
                      setQ("");
                      setPicker({ date: d, slot: s });
                    }}
                    onClear={() =>
                      update("plan", (p) => {
                        const n = { ...p };
                        delete n[planKey(d, s)];
                        return n;
                      })
                    }
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 180 }}>
        {activeRecipe ? <MiniRecipe recipe={activeRecipe} dragging /> : null}
      </DragOverlay>

      <Sheet
        open={!!picker}
        onClose={() => setPicker(null)}
        title={
          picker
            ? `${t(`meal.${picker.slot}`)} · ${fmtDay(picker.date)} ${fmtDate(picker.date)}`
            : ""
        }
      >
        <label htmlFor="picker-search" className="sr-only">
          {t("recipes.search")}
        </label>
        <input
          id="picker-search"
          className="input mb-3"
          placeholder={t("recipes.search")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
        <ul className="space-y-1.5">
          {pickerList.map((r) => (
            <li key={r.id}>
              <button
                className="flex w-full items-center gap-3 rounded-xl border border-line p-2 text-left transition hover:bg-surface2"
                onClick={() => {
                  if (!picker) return;
                  update("plan", (p) => ({ ...p, [planKey(picker.date, picker.slot)]: r.id }));
                  setPicker(null);
                  toast(t("planner.added"));
                }}
              >
                <RecipeArt recipe={r} className="h-11 w-11 shrink-0 rounded-lg [&>span]:text-2xl" />
                <span className="flex-1 text-sm font-semibold">{r.name}</span>
                <span className="text-xs text-muted">{r.time} min</span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </DndContext>
  );
}
