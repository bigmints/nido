"use client";

import { useMemo, useState } from "react";
import { chat, explainPrompt, friendlyError, isConfigured } from "@/lib/ai";
import { recentItemIds } from "@/lib/outfits/calendar";
import { suggestOutfits } from "@/lib/outfits/engine";
import { OCCASIONS, type Occasion, type Suggestion, type WardrobeItem } from "@/lib/outfits/types";
import { todayISO } from "@/lib/dates";
import { formatTemp } from "@/lib/weather";
import { uid, useApp } from "../AppProvider";
import { useAiConfig } from "../hooks";
import { EmptyState, Icon } from "../ui";
import { OutfitStrip } from "./Board";

export function Suggestions() {
  const { t, lang, data, update, weather, toast } = useApp();
  const ai = useAiConfig();
  const [occasion, setOccasion] = useState<Occasion>("casual");
  const [manualPick, setManual] = useState(false);
  const manual = manualPick || weather.status !== "ok";
  const [temp, setTemp] = useState(18);
  const [rain, setRain] = useState(false);
  const [explain, setExplain] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const today = todayISO();
  const units = data.settings.units;

  const live = weather.status === "ok" && !manual ? weather.data : null;
  const tempC = live ? live.feelsC : temp;
  const isRain = live ? live.rain : rain;

  const suggestions = useMemo(
    () =>
      suggestOutfits(data.wardrobe, {
        weather: { tempC, rain: isRain },
        occasion,
        recentItemIds: recentItemIds(
          data.outfitCalendar,
          data.outfits,
          today,
          data.settings.avoidRepeatDays,
        ),
      }),
    [
      data.wardrobe,
      data.outfitCalendar,
      data.outfits,
      data.settings.avoidRepeatDays,
      tempC,
      isRain,
      occasion,
      today,
    ],
  );

  const itemsOf = (s: Suggestion) =>
    s.itemIds
      .map((id) => data.wardrobe.find((w) => w.id === id))
      .filter((x): x is WardrobeItem => !!x);
  const keyOf = (s: Suggestion) => [...s.itemIds].sort().join("|");

  const ensureOutfit = (s: Suggestion): string => {
    const key = keyOf(s);
    const existing = data.outfits.find((o) => [...o.itemIds].sort().join("|") === key);
    if (existing) return existing.id;
    const id = uid();
    update("outfits", (o) => [
      ...o,
      {
        id,
        name: t("suggest.outfitName", { n: o.length + 1 }),
        itemIds: s.itemIds,
        occasion,
        createdAt: Date.now(),
      },
    ]);
    return id;
  };

  const explainIt = async (s: Suggestion) => {
    if (!isConfigured(ai)) return;
    const k = keyOf(s);
    setBusy(k);
    try {
      const text = await chat(
        ai,
        explainPrompt(
          itemsOf(s).map((i) => i.name),
          { tempC, rain: isRain, occasion },
          lang,
        ),
      );
      setExplain((e) => ({ ...e, [k]: text }));
    } catch (e) {
      toast(t(`ai.err.${friendlyError(e)}`));
    } finally {
      setBusy(null);
    }
  };

  if (data.wardrobe.length === 0)
    return (
      <EmptyState emoji="🧥" title={t("suggest.empty.title")} text={t("suggest.empty.text")} />
    );

  return (
    <div className="space-y-5">
      <section className="card space-y-4 p-4">
        <div>
          <span className="label">{t("suggest.occasion")}</span>
          <div className="flex flex-wrap gap-1.5">
            {OCCASIONS.map((o) => (
              <button
                key={o}
                aria-pressed={occasion === o}
                onClick={() => setOccasion(o)}
                className={`chip ${occasion === o ? "chip-on" : "hover:bg-surface2"}`}
              >
                {t(`occasion.${o}`)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="label">{t("suggest.weather")}</span>
          {weather.status === "ok" && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              <button
                aria-pressed={!manual}
                onClick={() => setManual(false)}
                className={`chip ${!manual ? "chip-on" : "hover:bg-surface2"}`}
              >
                {weather.data.emoji}{" "}
                {t("suggest.todayWeather", { temp: formatTemp(weather.data.feelsC, units) })}
              </button>
              <button
                aria-pressed={manual}
                onClick={() => setManual(true)}
                className={`chip ${manual ? "chip-on" : "hover:bg-surface2"}`}
              >
                {t("suggest.manual")}
              </button>
            </div>
          )}
          {(manual || weather.status !== "ok") && (
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex flex-1 items-center gap-3 text-sm font-semibold">
                <span className="min-w-[3.5rem]">{formatTemp(temp, units)}</span>
                <input
                  type="range"
                  min={-5}
                  max={40}
                  value={temp}
                  onChange={(e) => setTemp(Number(e.target.value))}
                  className="w-full accent-[rgb(var(--accent))]"
                  aria-label={t("suggest.temp")}
                />
              </label>
              <label className="chip cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rain}
                  onChange={(e) => setRain(e.target.checked)}
                  className="accent-[rgb(var(--accent))]"
                />
                🌧️ {t("suggest.rain")}
              </label>
            </div>
          )}
        </div>
      </section>

      {suggestions.length === 0 ? (
        <EmptyState emoji="🧵" title={t("suggest.none.title")} text={t("suggest.none.text")} />
      ) : (
        <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {suggestions.map((s, idx) => {
            const k = keyOf(s);
            return (
              <li
                key={k}
                className="card animate-rise flex flex-col gap-3 p-4"
                style={{ animationDelay: `${idx * 70}ms` }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{t("suggest.option", { n: idx + 1 })}</h3>
                  <span className="chip chip-on">{Math.round(s.score * 100)}%</span>
                </div>
                <OutfitStrip items={itemsOf(s)} size="h-[72px] w-[72px]" />
                <ul className="flex flex-wrap gap-1.5">
                  {s.reasons.map((r) => (
                    <li key={r} className="chip !bg-sage/70 !border-transparent">
                      {t(`reason.${r}`)}
                    </li>
                  ))}
                </ul>
                {explain[k] && (
                  <p className="rounded-xl bg-lilac/60 p-3 text-sm italic">✨ {explain[k]}</p>
                )}
                <div className="mt-auto flex flex-wrap gap-2 pt-1">
                  <button
                    className="btn btn-primary !min-h-[36px] !text-xs"
                    onClick={() => {
                      const id = ensureOutfit(s);
                      update("outfitCalendar", (c) => ({ ...c, [today]: id }));
                      toast(t("suggest.worn"));
                    }}
                  >
                    {t("suggest.wearToday")}
                  </button>
                  <button
                    className="btn btn-soft !min-h-[36px] !text-xs"
                    onClick={() => {
                      ensureOutfit(s);
                      toast(t("builder.saved"));
                    }}
                  >
                    <Icon name="heart" className="h-3.5 w-3.5" /> {t("common.save")}
                  </button>
                  {isConfigured(ai) && (
                    <button
                      className="btn btn-outline !min-h-[36px] !text-xs"
                      onClick={() => void explainIt(s)}
                      disabled={busy === k}
                    >
                      <Icon name="sparkle" className="h-3.5 w-3.5" />{" "}
                      {busy === k ? t("ai.thinking") : t("ai.explain")}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
