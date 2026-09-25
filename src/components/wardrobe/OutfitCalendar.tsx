"use client";

import { useState } from "react";
import { addDays, fromISO, startOfWeek, todayISO, weekDates } from "@/lib/dates";
import { dateLocale } from "@/lib/i18n";
import { repeatsWithin } from "@/lib/outfits/calendar";
import type { WardrobeItem } from "@/lib/outfits/types";
import { useApp } from "../AppProvider";
import { EmptyState, Icon, Sheet } from "../ui";
import { OutfitStrip } from "./Board";

export function OutfitCalendar() {
  const { t, lang, data, update, toast } = useApp();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(todayISO()));
  const [picking, setPicking] = useState<string | null>(null);
  const today = todayISO();
  const gap = data.settings.avoidRepeatDays;
  const loc = dateLocale(lang);
  const fmt = (iso: string, o: Intl.DateTimeFormatOptions) =>
    fromISO(iso).toLocaleDateString(loc, o);

  const itemsOf = (ids: string[]) =>
    ids.map((id) => data.wardrobe.find((w) => w.id === id)).filter((x): x is WardrobeItem => !!x);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          <button
            className="btn btn-outline !px-2.5"
            aria-label={t("planner.prev")}
            onClick={() => setWeekStart(addDays(weekStart, -7))}
          >
            <Icon name="chevronL" className="h-4 w-4" />
          </button>
          <button
            className="btn btn-outline !px-2.5"
            aria-label={t("planner.next")}
            onClick={() => setWeekStart(addDays(weekStart, 7))}
          >
            <Icon name="chevronR" className="h-4 w-4" />
          </button>
          <button className="btn btn-soft" onClick={() => setWeekStart(startOfWeek(today))}>
            {t("planner.thisWeek")}
          </button>
        </div>
        <p className="text-xs text-muted">{t("calendar.rule", { n: gap })}</p>
      </div>

      {data.outfits.length === 0 && (
        <EmptyState emoji="📅" title={t("calendar.empty.title")} text={t("calendar.empty.text")} />
      )}

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {weekDates(weekStart).map((d) => {
          const oid = data.outfitCalendar[d];
          const outfit = oid ? data.outfits.find((o) => o.id === oid) : undefined;
          return (
            <li
              key={d}
              className={`card flex items-center gap-3 p-3 ${d === today ? "ring-2 ring-accent" : ""}`}
            >
              <div className="w-14 shrink-0 text-center">
                <div className="text-xs font-bold uppercase text-muted">
                  {fmt(d, { weekday: "short" })}
                </div>
                <div className="font-display text-2xl font-semibold">{fromISO(d).getDate()}</div>
              </div>
              <div className="min-w-0 flex-1">
                {outfit ? (
                  <>
                    <div className="truncate text-sm font-semibold">{outfit.name}</div>
                    <OutfitStrip items={itemsOf(outfit.itemIds)} size="h-10 w-10" />
                  </>
                ) : (
                  <span className="text-sm text-muted">{t("calendar.free")}</span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <button
                  className="btn btn-soft !min-h-[34px] !px-3 !text-xs"
                  onClick={() => setPicking(d)}
                  disabled={data.outfits.length === 0}
                >
                  {outfit ? t("calendar.change") : t("calendar.choose")}
                </button>
                {outfit && (
                  <button
                    className="text-xs text-muted underline-offset-2 hover:underline"
                    onClick={() =>
                      update("outfitCalendar", (c) => {
                        const n = { ...c };
                        delete n[d];
                        return n;
                      })
                    }
                  >
                    {t("common.remove")}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <Sheet
        open={!!picking}
        onClose={() => setPicking(null)}
        title={
          picking
            ? t("calendar.pick", {
                date: fmt(picking, { weekday: "long", day: "numeric", month: "long" }),
              })
            : ""
        }
      >
        <ul className="space-y-2">
          {picking &&
            data.outfits.map((o) => {
              const clash = repeatsWithin(data.outfitCalendar, picking, o.id, gap);
              return (
                <li key={o.id}>
                  <button
                    disabled={!!clash}
                    onClick={() => {
                      update("outfitCalendar", (c) => ({ ...c, [picking]: o.id }));
                      setPicking(null);
                      toast(t("calendar.assigned"));
                    }}
                    className="flex w-full items-center gap-3 rounded-xl border border-line p-2.5 text-left transition hover:bg-surface2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{o.name}</div>
                      {clash ? (
                        <div className="text-xs text-[#b3261e] dark:text-[#ff9c94]">
                          {t("calendar.repeat", {
                            date: fmt(clash, { weekday: "short", day: "numeric", month: "short" }),
                          })}
                        </div>
                      ) : (
                        <OutfitStrip items={itemsOf(o.itemIds)} size="h-9 w-9" />
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
        </ul>
      </Sheet>
    </div>
  );
}
