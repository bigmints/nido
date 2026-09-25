"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { translate, type TKey, type Vars } from "@/lib/i18n";
import { RECIPES } from "@/lib/recipes";
import type { Recipe } from "@/lib/recipes/types";
import { todayISO } from "@/lib/dates";
import { demoData } from "@/lib/seed";
import { exportBackup, importBackup, parseBackup } from "@/lib/storage/backup";
import { IdbRepository, type Repository } from "@/lib/storage/repository";
import { defaultData, type AppData, type Lang, type Settings } from "@/lib/storage/schema";
import { fetchWeather, locate, type City, type Weather } from "@/lib/weather";

export type WeatherState =
  | { status: "idle" | "loading" | "nocity" }
  | { status: "error"; message: string }
  | { status: "ok"; data: Weather };

interface Ctx {
  ready: boolean;
  data: AppData;
  lang: Lang;
  t: (key: TKey, vars?: Vars) => string;
  update: <K extends keyof AppData>(
    key: K,
    value: AppData[K] | ((prev: AppData[K]) => AppData[K]),
  ) => void;
  setSettings: (patch: Partial<Settings>) => void;
  recipes: Recipe[];
  recipeById: (id: string) => Recipe | undefined;
  weather: WeatherState;
  refreshWeather: () => void;
  locateMe: () => Promise<void>;
  setCity: (c: City) => void;
  savePhoto: (dataUrl: string) => Promise<string>;
  putPhoto: (id: string, dataUrl: string) => Promise<void>;
  removePhoto: (id: string) => Promise<void>;
  getPhoto: (id: string) => Promise<string | undefined>;
  loadDemo: () => Promise<void>;
  clearAll: () => Promise<void>;
  exportJSON: () => Promise<string>;
  importJSON: (text: string) => Promise<void>;
  toast: (message: string) => void;
  toastMsg: string | null;
}

const AppContext = createContext<Ctx | null>(null);

export function useApp(): Ctx {
  const c = useContext(AppContext);
  if (!c) throw new Error("useApp must be used inside <AppProvider>");
  return c;
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export { uid };

function applyTheme(theme: Settings["theme"]) {
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  try {
    localStorage.setItem("nido-theme", theme);
  } catch {
    /* ignore */
  }
}

const photoCache = new Map<string, string>();

export function AppProvider({ children }: { children: ReactNode }) {
  const repoRef = useRef<Repository | null>(null);
  const dataRef = useRef<AppData>(defaultData());
  const [data, setData] = useState<AppData>(defaultData);
  const [ready, setReady] = useState(false);
  const [weather, setWeather] = useState<WeatherState>({ status: "idle" });
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const repo = useCallback((): Repository => {
    if (!repoRef.current) repoRef.current = new IdbRepository();
    return repoRef.current;
  }, []);

  // initial load
  useEffect(() => {
    let alive = true;
    (async () => {
      let stored: Partial<AppData> = {};
      try {
        stored = await repo().getAll();
      } catch {
        /* private mode etc.: run with in-memory state */
      }
      const merged: AppData = {
        ...defaultData(),
        ...stored,
        settings: { ...defaultData().settings, ...(stored.settings ?? {}) },
      };
      if (!alive) return;
      dataRef.current = merged;
      setData(merged);
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [repo]);

  const update: Ctx["update"] = useCallback(
    (key, value) => {
      const prev = dataRef.current[key];
      const next =
        typeof value === "function" ? (value as (p: typeof prev) => typeof prev)(prev) : value;
      dataRef.current = { ...dataRef.current, [key]: next };
      setData(dataRef.current);
      repo()
        .set(key, next)
        .catch(() => {});
    },
    [repo],
  );

  const setSettings = useCallback(
    (patch: Partial<Settings>) => update("settings", (s) => ({ ...s, ...patch })),
    [update],
  );

  // theme + language attribute
  useEffect(() => {
    if (!ready) return;
    applyTheme(data.settings.theme);
    document.documentElement.lang = data.settings.lang;
    if (data.settings.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => applyTheme("system");
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [ready, data.settings.theme, data.settings.lang]);

  // weather
  const city = data.settings.city;
  const loadWeather = useCallback(async (c: City | null) => {
    if (!c) {
      setWeather({ status: "nocity" });
      return;
    }
    setWeather({ status: "loading" });
    try {
      setWeather({ status: "ok", data: await fetchWeather(c) });
    } catch (e) {
      setWeather({ status: "error", message: e instanceof Error ? e.message : "error" });
    }
  }, []);
  useEffect(() => {
    if (ready) void loadWeather(city);
  }, [ready, city, loadWeather]);

  const setCity = useCallback((c: City) => setSettings({ city: c }), [setSettings]);
  const locateMe = useCallback(async () => {
    setWeather({ status: "loading" });
    try {
      const p = await locate();
      setSettings({ city: { name: "📍", lat: p.lat, lon: p.lon } });
    } catch (e) {
      setWeather({ status: "error", message: e instanceof Error ? e.message : "error" });
    }
  }, [setSettings]);

  const toast = useCallback((message: string) => {
    setToastMsg(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2800);
  }, []);

  const savePhoto = useCallback(
    async (dataUrl: string) => {
      const id = uid();
      photoCache.set(id, dataUrl);
      await repo().putPhoto(id, dataUrl);
      return id;
    },
    [repo],
  );
  const putPhoto = useCallback(
    async (id: string, dataUrl: string) => {
      photoCache.set(id, dataUrl);
      await repo().putPhoto(id, dataUrl);
    },
    [repo],
  );
  const removePhoto = useCallback(
    async (id: string) => {
      photoCache.delete(id);
      await repo().deletePhoto(id);
    },
    [repo],
  );
  const getPhoto = useCallback(
    async (id: string) => {
      if (photoCache.has(id)) return photoCache.get(id);
      const p = await repo().getPhoto(id);
      if (p) photoCache.set(id, p);
      return p;
    },
    [repo],
  );

  const replaceAll = useCallback(async (next: AppData) => {
    dataRef.current = next;
    setData(next);
  }, []);

  const loadDemo = useCallback(async () => {
    const demo = demoData(todayISO());
    const cur = dataRef.current;
    const next: AppData = {
      ...cur,
      ...demo,
      // keep anything the user already has
      wardrobe: [
        ...cur.wardrobe.filter((i) => !i.id.startsWith("demo-")),
        ...(demo.wardrobe ?? []),
      ],
      outfits: [...cur.outfits.filter((o) => !o.id.startsWith("demo-")), ...(demo.outfits ?? [])],
      plan: { ...cur.plan, ...(demo.plan ?? {}) },
      outfitCalendar: { ...cur.outfitCalendar, ...(demo.outfitCalendar ?? {}) },
      fridge: cur.fridge.length ? cur.fridge : (demo.fridge ?? []),
    };
    await replaceAll(next);
    for (const k of [
      "wardrobe",
      "outfits",
      "plan",
      "outfitCalendar",
      "fridge",
      "checked",
    ] as const) {
      await repo().set(k, next[k] as never);
    }
  }, [repo, replaceAll]);

  const clearAll = useCallback(async () => {
    photoCache.clear();
    await repo().clear();
    const fresh = defaultData();
    fresh.settings = {
      ...fresh.settings,
      lang: dataRef.current.settings.lang,
      theme: dataRef.current.settings.theme,
    };
    await replaceAll(fresh);
    await repo().set("settings", fresh.settings);
  }, [repo, replaceAll]);

  const exportJSON = useCallback(
    async () => JSON.stringify(await exportBackup(repo()), null, 1),
    [repo],
  );
  const importJSON = useCallback(
    async (text: string) => {
      const backup = parseBackup(text);
      await importBackup(repo(), backup);
      photoCache.clear();
      const stored = await repo().getAll();
      await replaceAll({
        ...defaultData(),
        ...stored,
        settings: { ...defaultData().settings, ...(stored.settings ?? {}) },
      });
    },
    [repo, replaceAll],
  );

  const lang = data.settings.lang;
  const t = useCallback((key: TKey, vars?: Vars) => translate(lang, key, vars), [lang]);
  const recipes = useMemo(() => [...RECIPES, ...data.customRecipes], [data.customRecipes]);
  const recipeById = useCallback((id: string) => recipes.find((r) => r.id === id), [recipes]);

  const value: Ctx = {
    ready,
    data,
    lang,
    t,
    update,
    setSettings,
    recipes,
    recipeById,
    weather,
    refreshWeather: () => void loadWeather(city),
    locateMe,
    setCity,
    savePhoto,
    putPhoto,
    removePhoto,
    getPhoto,
    loadDemo,
    clearAll,
    exportJSON,
    importJSON,
    toast,
    toastMsg,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
