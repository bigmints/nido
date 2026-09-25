"use client";

import { useEffect, useState } from "react";
import { searchCity, type City } from "@/lib/weather";
import { useApp } from "./AppProvider";
import { Icon } from "./ui";

export function CitySearch({ onDone }: { onDone?: () => void }) {
  const { t, lang, setCity, locateMe } = useApp();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<(City & { detail: string })[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    let alive = true;
    const id = setTimeout(async () => {
      try {
        const r = await searchCity(q, lang);
        if (alive) {
          setResults(r);
          setError(false);
        }
      } catch {
        if (alive) setError(true);
      }
    }, 350);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [q, lang]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          />
          <label htmlFor="city-q" className="sr-only">
            {t("weather.searchCity")}
          </label>
          <input
            id="city-q"
            className="input !pl-9"
            placeholder={t("weather.searchCity")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoComplete="off"
          />
        </div>
        <button
          className="btn btn-soft"
          onClick={() => {
            void locateMe();
            onDone?.();
          }}
        >
          <Icon name="pin" className="h-4 w-4" /> {t("weather.useLocation")}
        </button>
      </div>
      {error && <p className="text-xs text-muted">{t("weather.searchError")}</p>}
      {results.length > 0 && (
        <ul className="overflow-hidden rounded-xl border border-line bg-surface">
          {results.map((r) => (
            <li key={`${r.lat},${r.lon}`}>
              <button
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-surface2"
                onClick={() => {
                  setCity({ name: r.name, lat: r.lat, lon: r.lon });
                  setQ("");
                  setResults([]);
                  onDone?.();
                }}
              >
                <span className="font-semibold">{r.name}</span>
                <span className="text-xs text-muted">{r.detail}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
