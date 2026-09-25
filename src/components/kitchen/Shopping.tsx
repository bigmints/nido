"use client";

import { useState } from "react";
import { fromISO } from "@/lib/dates";
import { dateLocale } from "@/lib/i18n";
import { shoppingToText } from "@/lib/shopping/text";
import { cap } from "@/lib/text";
import { formatQty } from "@/lib/shopping/units";
import { useApp } from "../AppProvider";
import { useShoppingList } from "../hooks";
import { EmptyState, Icon } from "../ui";
import { addDays } from "@/lib/dates";

export function Shopping({ weekStart }: { weekStart: string }) {
  const { t, lang, data, update, setSettings, toast } = useApp();
  const [subtract, setSubtract] = useState(true);
  const list = useShoppingList(weekStart, subtract);
  const imperial = data.settings.units === "imperial";

  const all = list.flatMap((s) => s.items);
  const done = all.filter((i) => data.checked[i.key]).length;
  const range = `${fromISO(weekStart).toLocaleDateString(dateLocale(lang), { day: "numeric", month: "short" })} – ${fromISO(addDays(weekStart, 6)).toLocaleDateString(dateLocale(lang), { day: "numeric", month: "short" })}`;

  const text = () =>
    shoppingToText(list, (s) => t(`section.${s}`), {
      checked: data.checked,
      title: `${t("shopping.title")} · ${range}`,
      imperial,
    });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text());
      toast(t("shopping.copied"));
    } catch {
      toast(t("shopping.copyFail"));
    }
  };

  const toggle = (key: string) => update("checked", (c) => ({ ...c, [key]: !c[key] }));

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h2 className="text-xl font-semibold">{t("shopping.title")}</h2>
          <p className="text-sm text-muted">{range}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-1 rounded-full border border-line bg-surface p-0.5"
            role="group"
            aria-label={t("shopping.people")}
          >
            <button
              className="btn btn-soft !min-h-[32px] !px-3"
              aria-label="-"
              onClick={() => setSettings({ people: Math.max(1, data.settings.people - 1) })}
            >
              −
            </button>
            <span className="min-w-[4.5rem] text-center text-xs font-semibold">
              {t("shopping.peopleN", { n: data.settings.people })}
            </span>
            <button
              className="btn btn-soft !min-h-[32px] !px-3"
              aria-label="+"
              onClick={() => setSettings({ people: Math.min(12, data.settings.people + 1) })}
            >
              +
            </button>
          </div>
          <label className="chip cursor-pointer select-none hover:bg-surface2">
            <input
              type="checkbox"
              className="accent-[rgb(var(--accent))]"
              checked={subtract}
              onChange={(e) => setSubtract(e.target.checked)}
            />
            {t("shopping.subtract")}
          </label>
        </div>
      </div>

      {all.length === 0 ? (
        <EmptyState emoji="🛒" title={t("shopping.empty.title")} text={t("shopping.empty.text")} />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <div className="h-2 w-28 overflow-hidden rounded-full bg-surface2" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-sage transition-all"
                  style={{
                    width: `${(done / all.length) * 100}%`,
                    background: "rgb(var(--accent))",
                  }}
                />
              </div>
              {t("shopping.progress", { done, total: all.length })}
            </div>
            <div className="flex gap-2">
              <button className="btn btn-primary" onClick={() => void copy()}>
                <Icon name="copy" className="h-4 w-4" /> {t("shopping.copy")}
              </button>
              <button className="btn btn-outline" onClick={() => update("checked", {})}>
                <Icon name="refresh" className="h-4 w-4" /> {t("shopping.reset")}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {list.map((s) => (
              <section key={s.section} className="card p-4">
                <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold">
                  <span aria-hidden="true">
                    {
                      {
                        produce: "🥬",
                        meat: "🥩",
                        fish: "🐟",
                        dairy: "🧀",
                        bakery: "🥖",
                        pantry: "🥫",
                        basics: "🧂",
                      }[s.section]
                    }
                  </span>
                  {t(`section.${s.section}`)}
                </h3>
                <ul className="divide-y divide-line">
                  {s.items.map((i) => {
                    const on = !!data.checked[i.key];
                    return (
                      <li key={i.key}>
                        <label className="flex cursor-pointer items-center gap-3 py-2.5">
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={on}
                            onChange={() => toggle(i.key)}
                          />
                          <span
                            aria-hidden="true"
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-line text-accent-ink transition peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2"
                          >
                            {on && <Icon name="check" className="h-3.5 w-3.5" strokeWidth={3} />}
                          </span>
                          <span className={`flex-1 text-sm ${on ? "text-muted line-through" : ""}`}>
                            {cap(i.name)}
                            <span className="block text-[11px] text-muted">
                              {i.recipes.slice(0, 2).join(", ")}
                              {i.recipes.length > 2 ? "…" : ""}
                            </span>
                          </span>
                          <span className={`text-sm font-semibold ${on ? "text-muted" : ""}`}>
                            {formatQty(i.qty, i.unit, imperial)}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
