"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { fromISO, startOfWeek, todayISO } from "@/lib/dates";
import { dateLocale } from "@/lib/i18n";
import { recentItemIds } from "@/lib/outfits/calendar";
import { suggestOutfits } from "@/lib/outfits/engine";
import type { WardrobeItem } from "@/lib/outfits/types";
import { MEAL_SLOTS } from "@/lib/recipes/types";
import { planKey } from "@/lib/shopping/build";
import { cap } from "@/lib/text";
import { formatQty } from "@/lib/shopping/units";
import { formatTemp } from "@/lib/weather";
import { uid, useApp } from "./AppProvider";
import { CitySearch } from "./CitySearch";
import { useShoppingList } from "./hooks";
import { RecipeArt } from "./art";
import { OutfitStrip } from "./wardrobe/Board";
import { Icon } from "./ui";

function greetingKey(): "home.greet.morning" | "home.greet.afternoon" | "home.greet.evening" {
  const h = new Date().getHours();
  return h < 13 ? "home.greet.morning" : h < 20 ? "home.greet.afternoon" : "home.greet.evening";
}

export function Home() {
  const { t, lang, data, update, weather, refreshWeather, recipeById, loadDemo, toast } = useApp();
  const today = todayISO();
  const [changingCity, setChangingCity] = useState(false);
  const units = data.settings.units;
  const cityName =
    data.settings.city?.name === "📍" ? t("weather.myLocation") : data.settings.city?.name;

  const shopping = useShoppingList(startOfWeek(today), true);
  const shoppingItems = shopping.flatMap((s) => s.items);
  const pending = shoppingItems.filter((i) => !data.checked[i.key]);

  const empty =
    data.wardrobe.length === 0 && data.fridge.length === 0 && Object.keys(data.plan).length === 0;

  // today's outfit: the planned one, else the engine's best guess
  const planned = data.outfitCalendar[today]
    ? data.outfits.find((o) => o.id === data.outfitCalendar[today])
    : undefined;
  const suggestion = useMemo(() => {
    if (planned || data.wardrobe.length === 0) return null;
    const w =
      weather.status === "ok"
        ? { tempC: weather.data.feelsC, rain: weather.data.rain }
        : { tempC: 18, rain: false };
    return (
      suggestOutfits(data.wardrobe, {
        weather: w,
        occasion: "casual",
        recentItemIds: recentItemIds(
          data.outfitCalendar,
          data.outfits,
          today,
          data.settings.avoidRepeatDays,
        ),
        count: 1,
      })[0] ?? null
    );
  }, [
    planned,
    data.wardrobe,
    data.outfitCalendar,
    data.outfits,
    data.settings.avoidRepeatDays,
    weather,
    today,
  ]);

  const itemsOf = (ids: string[]) =>
    ids.map((id) => data.wardrobe.find((w) => w.id === id)).filter((x): x is WardrobeItem => !!x);

  const dateLabel = fromISO(today).toLocaleDateString(dateLocale(lang), {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const wearSuggestion = () => {
    if (!suggestion) return;
    const key = [...suggestion.itemIds].sort().join("|");
    let id = data.outfits.find((o) => [...o.itemIds].sort().join("|") === key)?.id;
    if (!id) {
      id = uid();
      const newId = id;
      update("outfits", (o) => [
        ...o,
        {
          id: newId,
          name: t("suggest.outfitName", { n: o.length + 1 }),
          itemIds: suggestion.itemIds,
          occasion: "casual",
          createdAt: Date.now(),
        },
      ]);
    }
    const finalId = id;
    update("outfitCalendar", (c) => ({ ...c, [today]: finalId }));
    toast(t("suggest.worn"));
  };

  return (
    <div className="space-y-5">
      <header className="page-in">
        <p className="text-sm font-semibold text-muted first-letter:uppercase">{dateLabel}</p>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          {t(greetingKey())} <span aria-hidden="true">🌷</span>
        </h1>
      </header>

      {empty && (
        <section className="card animate-rise relative overflow-hidden border-transparent bg-gradient-to-br from-rose to-butter p-6">
          <div className="max-w-md">
            <h2 className="text-2xl font-semibold">{t("home.welcome.title")}</h2>
            <p className="mt-1 text-sm">{t("home.welcome.text")}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="btn btn-primary"
                onClick={() => void loadDemo().then(() => toast(t("demo.loaded")))}
              >
                <Icon name="sparkle" className="h-4 w-4" /> {t("demo.load")}
              </button>
              <Link href="/cocina/" className="btn btn-outline">
                {t("nav.kitchen")}
              </Link>
              <Link href="/armario/" className="btn btn-outline">
                {t("nav.wardrobe")}
              </Link>
            </div>
          </div>
          <div
            className="pointer-events-none absolute -right-2 -top-2 text-8xl opacity-30"
            aria-hidden="true"
          >
            🪺
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* weather */}
        <section
          className="card animate-rise relative overflow-hidden p-5 md:col-span-2"
          aria-label={t("home.weather")}
        >
          <div
            className="absolute inset-0 -z-0 bg-gradient-to-br from-sky/70 via-transparent to-butter/50"
            aria-hidden="true"
          />
          <div className="relative">
            {weather.status === "ok" ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-6xl" aria-hidden="true">
                    {weather.data.emoji}
                  </span>
                  <div>
                    <div className="font-display text-5xl font-semibold leading-none">
                      {formatTemp(weather.data.tempC, units)}
                    </div>
                    <div className="mt-1 text-sm text-muted">
                      {t(`weather.${weather.data.kind}`)} ·{" "}
                      {t("weather.feels", { temp: formatTemp(weather.data.feelsC, units) })}
                    </div>
                  </div>
                </div>
                <div className="text-sm">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Icon name="pin" className="h-4 w-4 text-accent" />
                    {cityName}
                  </div>
                  <div className="text-muted">
                    ↑ {formatTemp(weather.data.maxC, units)} · ↓{" "}
                    {formatTemp(weather.data.minC, units)} · 🌧 {weather.data.precipProb}%
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      className="btn btn-soft !min-h-[32px] !px-3 !text-xs"
                      onClick={() => setChangingCity((v) => !v)}
                    >
                      {t("weather.change")}
                    </button>
                    <button
                      className="btn btn-soft !min-h-[32px] !px-3 !text-xs"
                      onClick={refreshWeather}
                      aria-label={t("weather.refresh")}
                    >
                      <Icon name="refresh" className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-4xl" aria-hidden="true">
                    {weather.status === "loading" ? "⏳" : "🌤️"}
                  </span>
                  <div>
                    <h2 className="text-xl font-semibold">
                      {weather.status === "loading"
                        ? t("weather.loading")
                        : weather.status === "error"
                          ? t("weather.error")
                          : t("weather.setup")}
                    </h2>
                    <p className="text-sm text-muted">
                      {weather.status === "error" ? t("weather.errorHint") : t("weather.setupHint")}
                    </p>
                  </div>
                </div>
                {weather.status !== "loading" && <CitySearch />}
              </div>
            )}
            {changingCity && weather.status === "ok" && (
              <div className="mt-4">
                <CitySearch onDone={() => setChangingCity(false)} />
              </div>
            )}
          </div>
        </section>

        {/* outfit */}
        <section
          className="card animate-rise p-5"
          style={{ animationDelay: "60ms" }}
          aria-label={t("home.outfit")}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold">👗 {t("home.outfit")}</h2>
            <Link href="/armario/" className="text-xs font-semibold text-accent hover:underline">
              {t("home.seeAll")}
            </Link>
          </div>
          {planned ? (
            <div className="space-y-2">
              <div className="text-sm font-semibold">{planned.name}</div>
              <OutfitStrip items={itemsOf(planned.itemIds)} size="h-[72px] w-[72px]" />
            </div>
          ) : suggestion ? (
            <div className="space-y-3">
              <p className="text-sm text-muted">{t("home.outfit.suggested")}</p>
              <OutfitStrip items={itemsOf(suggestion.itemIds)} size="h-[72px] w-[72px]" />
              <button className="btn btn-primary !min-h-[36px] !text-xs" onClick={wearSuggestion}>
                {t("suggest.wearToday")}
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted">{t("home.outfit.empty")}</p>
          )}
        </section>

        {/* meals */}
        <section
          className="card animate-rise p-5"
          style={{ animationDelay: "120ms" }}
          aria-label={t("home.meals")}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold">🍽️ {t("home.meals")}</h2>
            <Link href="/cocina/" className="text-xs font-semibold text-accent hover:underline">
              {t("home.plan")}
            </Link>
          </div>
          <ul className="space-y-2">
            {MEAL_SLOTS.map((s) => {
              const r = recipeById(data.plan[planKey(today, s)] ?? "");
              return (
                <li key={s} className="flex items-center gap-3 rounded-xl bg-surface2/60 p-2">
                  {r ? (
                    <RecipeArt
                      recipe={r}
                      className="h-11 w-11 shrink-0 rounded-lg [&>span]:text-2xl"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-dashed border-line text-muted">
                      <Icon name="plus" className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-muted">
                      {t(`meal.${s}`)}
                    </div>
                    <div className="truncate text-sm font-semibold">
                      {r ? r.name : t("home.meals.free")}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* shopping glance */}
        <section
          className="card animate-rise p-5 md:col-span-2"
          style={{ animationDelay: "180ms" }}
          aria-label={t("home.shopping")}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold">🛒 {t("home.shopping")}</h2>
            <Link href="/cocina/" className="text-xs font-semibold text-accent hover:underline">
              {t("home.openList")}
            </Link>
          </div>
          {shoppingItems.length === 0 ? (
            <p className="text-sm text-muted">{t("home.shopping.empty")}</p>
          ) : (
            <>
              <p className="mb-2 text-sm text-muted">
                {t("home.shopping.count", { n: pending.length })}
              </p>
              <ul className="flex flex-wrap gap-2">
                {pending.slice(0, 8).map((i) => (
                  <li key={i.key} className="chip">
                    {cap(i.name)}{" "}
                    <span className="text-muted">
                      {formatQty(i.qty, i.unit, units === "imperial")}
                    </span>
                  </li>
                ))}
                {pending.length > 8 && <li className="chip">+{pending.length - 8}</li>}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
