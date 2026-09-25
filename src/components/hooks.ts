"use client";

import { useEffect, useMemo, useState } from "react";
import { loadAiConfig, type AiConfig } from "@/lib/ai";
import { startOfWeek, todayISO, weekDates } from "@/lib/dates";
import { buildShoppingList, type ShoppingSection } from "@/lib/shopping/build";
import { useApp } from "./AppProvider";

/** Optional AI settings, read from localStorage after mount (never during SSR). */
export function useAiConfig(): AiConfig | null {
  const [cfg, setCfg] = useState<AiConfig | null>(null);
  useEffect(() => {
    setCfg(loadAiConfig());
    const on = () => setCfg(loadAiConfig());
    window.addEventListener("storage", on);
    window.addEventListener("nido-ai-changed", on);
    return () => {
      window.removeEventListener("storage", on);
      window.removeEventListener("nido-ai-changed", on);
    };
  }, []);
  return cfg;
}

export function useShoppingList(weekStart: string, subtractFridge = true): ShoppingSection[] {
  const { data, recipes } = useApp();
  return useMemo(
    () =>
      buildShoppingList({
        plan: data.plan,
        recipes,
        dates: weekDates(weekStart),
        fridge: subtractFridge ? data.fridge : [],
        people: data.settings.people,
      }),
    [data.plan, data.fridge, data.settings.people, recipes, weekStart, subtractFridge],
  );
}

export const currentWeekStart = () => startOfWeek(todayISO());
