"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  chat,
  friendlyError,
  isConfigured,
  loadAiConfig,
  saveAiConfig,
  type AiConfig,
} from "@/lib/ai";
import type { Settings } from "@/lib/storage/schema";
import { todayISO } from "@/lib/dates";
import { useApp } from "./AppProvider";
import { CitySearch } from "./CitySearch";
import { Icon, PageHeader } from "./ui";

function Section({ title, children, hint }: { title: string; children: ReactNode; hint?: string }) {
  return (
    <section className="card animate-rise p-5">
      <h2 className="text-xl font-semibold">{title}</h2>
      {hint && <p className="mb-3 mt-0.5 text-sm text-muted">{hint}</p>}
      <div className={hint ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

function Choice<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={`chip !px-4 !py-1.5 text-sm ${value === o.id ? "chip-on" : "hover:bg-surface2"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsView() {
  const { t, data, setSettings, loadDemo, clearAll, exportJSON, importJSON, toast } = useApp();
  const s = data.settings;
  const importRef = useRef<HTMLInputElement>(null);
  const [ai, setAi] = useState<AiConfig>({ baseUrl: "", apiKey: "", model: "" });
  const [testing, setTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    const c = loadAiConfig();
    if (c) setAi(c);
  }, []);

  const saveAi = () => {
    saveAiConfig(ai);
    window.dispatchEvent(new Event("nido-ai-changed"));
    toast(isConfigured(ai) ? t("ai.saved") : t("ai.disabled"));
  };

  const testAi = async () => {
    setTesting(true);
    try {
      await chat(ai, [{ role: "user", content: "Reply with the single word: ok" }]);
      toast(t("ai.testOk"));
    } catch (e) {
      toast(t(`ai.err.${friendlyError(e)}`));
    } finally {
      setTesting(false);
    }
  };

  const download = async () => {
    const blob = new Blob([await exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nido-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast(t("data.exported"));
  };

  const onImport = async (file?: File) => {
    if (!file) return;
    try {
      await importJSON(await file.text());
      toast(t("data.imported"));
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      toast(code === "unsupported-version" ? t("data.err.version") : t("data.err.invalid"));
    }
    if (importRef.current) importRef.current.value = "";
  };

  return (
    <div>
      <PageHeader title={t("nav.settings")} subtitle={t("settings.subtitle")} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Section title={t("settings.language")}>
          <Choice<Settings["lang"]>
            label={t("settings.language")}
            value={s.lang}
            onChange={(lang) => setSettings({ lang })}
            options={[
              { id: "es", label: "Español" },
              { id: "en", label: "English" },
            ]}
          />
          {s.lang === "en" && (
            <p className="mt-2 text-xs text-muted">{t("settings.recipesSpanish")}</p>
          )}
        </Section>

        <Section title={t("settings.theme")}>
          <Choice<Settings["theme"]>
            label={t("settings.theme")}
            value={s.theme}
            onChange={(theme) => setSettings({ theme })}
            options={[
              { id: "system", label: t("settings.theme.system") },
              { id: "light", label: t("settings.theme.light") },
              { id: "dark", label: t("settings.theme.dark") },
            ]}
          />
        </Section>

        <Section title={t("settings.units")}>
          <Choice<Settings["units"]>
            label={t("settings.units")}
            value={s.units}
            onChange={(units) => setSettings({ units })}
            options={[
              { id: "metric", label: t("settings.units.metric") },
              { id: "imperial", label: t("settings.units.imperial") },
            ]}
          />
        </Section>

        <Section
          title={t("settings.city")}
          hint={
            s.city
              ? t("settings.cityCurrent", {
                  name: s.city.name === "📍" ? t("weather.myLocation") : s.city.name,
                })
              : t("settings.cityNone")
          }
        >
          <CitySearch />
          <p className="mt-2 text-xs text-muted">{t("settings.cityPrivacy")}</p>
        </Section>

        <Section title={t("settings.people")} hint={t("settings.peopleHint")}>
          <div className="flex items-center gap-2">
            <button
              className="btn btn-soft"
              aria-label="-"
              onClick={() => setSettings({ people: Math.max(1, s.people - 1) })}
            >
              −
            </button>
            <span
              className="min-w-[2rem] text-center font-display text-2xl font-semibold"
              aria-live="polite"
            >
              {s.people}
            </span>
            <button
              className="btn btn-soft"
              aria-label="+"
              onClick={() => setSettings({ people: Math.min(12, s.people + 1) })}
            >
              +
            </button>
          </div>
        </Section>

        <Section title={t("settings.repeat")} hint={t("settings.repeatHint")}>
          <div className="flex items-center gap-2">
            <button
              className="btn btn-soft"
              aria-label="-"
              onClick={() => setSettings({ avoidRepeatDays: Math.max(0, s.avoidRepeatDays - 1) })}
            >
              −
            </button>
            <span
              className="min-w-[4rem] text-center font-display text-2xl font-semibold"
              aria-live="polite"
            >
              {s.avoidRepeatDays} {t("common.days")}
            </span>
            <button
              className="btn btn-soft"
              aria-label="+"
              onClick={() => setSettings({ avoidRepeatDays: Math.min(30, s.avoidRepeatDays + 1) })}
            >
              +
            </button>
          </div>
        </Section>

        <div className="md:col-span-2">
          <Section title={t("data.title")} hint={t("data.hint")}>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-primary" onClick={() => void download()}>
                <Icon name="download" className="h-4 w-4" /> {t("data.export")}
              </button>
              <input
                ref={importRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                aria-label={t("data.import")}
                onChange={(e) => void onImport(e.target.files?.[0])}
              />
              <button className="btn btn-soft" onClick={() => importRef.current?.click()}>
                <Icon name="upload" className="h-4 w-4" /> {t("data.import")}
              </button>
              <button
                className="btn btn-soft"
                onClick={() => void loadDemo().then(() => toast(t("demo.loaded")))}
              >
                <Icon name="sparkle" className="h-4 w-4" /> {t("demo.load")}
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  if (window.confirm(t("data.clearConfirm")))
                    void clearAll().then(() => toast(t("data.cleared")));
                }}
              >
                <Icon name="trash" className="h-4 w-4" /> {t("data.clear")}
              </button>
            </div>
            <p className="mt-3 text-xs text-muted">{t("data.backupNote")}</p>
          </Section>
        </div>

        <div className="md:col-span-2">
          <Section title={`✨ ${t("ai.title")}`} hint={t("ai.intro")}>
            <div className="mb-4 rounded-xl bg-lilac/60 p-3 text-sm">🔒 {t("ai.privacy")}</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="ai-url">
                  {t("ai.baseUrl")}
                </label>
                <input
                  id="ai-url"
                  className="input"
                  inputMode="url"
                  autoComplete="off"
                  placeholder="https://api.openai.com/v1"
                  value={ai.baseUrl}
                  onChange={(e) => setAi({ ...ai, baseUrl: e.target.value })}
                />
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <button
                    className="chip hover:bg-surface2"
                    onClick={() =>
                      setAi({
                        ...ai,
                        baseUrl: "https://api.openai.com/v1",
                        model: ai.model || "gpt-4o-mini",
                      })
                    }
                  >
                    OpenAI
                  </button>
                  <button
                    className="chip hover:bg-surface2"
                    onClick={() =>
                      setAi({
                        baseUrl: "http://localhost:11434/v1",
                        apiKey: "",
                        model: ai.model || "llama3.2",
                      })
                    }
                  >
                    Ollama (localhost)
                  </button>
                </div>
              </div>
              <div>
                <label className="label" htmlFor="ai-model">
                  {t("ai.model")}
                </label>
                <input
                  id="ai-model"
                  className="input"
                  autoComplete="off"
                  placeholder="gpt-4o-mini"
                  value={ai.model}
                  onChange={(e) => setAi({ ...ai, model: e.target.value })}
                />
              </div>
              <div>
                <label className="label" htmlFor="ai-key">
                  {t("ai.key")}
                </label>
                <div className="flex gap-2">
                  <input
                    id="ai-key"
                    className="input"
                    type={showKey ? "text" : "password"}
                    autoComplete="off"
                    placeholder="sk-…"
                    value={ai.apiKey}
                    onChange={(e) => setAi({ ...ai, apiKey: e.target.value })}
                  />
                  <button
                    className="btn btn-soft"
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    aria-pressed={showKey}
                  >
                    {showKey ? t("ai.hide") : t("ai.show")}
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn btn-primary" onClick={saveAi}>
                {t("common.save")}
              </button>
              <button
                className="btn btn-outline"
                onClick={() => void testAi()}
                disabled={!isConfigured(ai) || testing}
              >
                {testing ? t("ai.thinking") : t("ai.test")}
              </button>
              <button
                className="btn btn-outline"
                onClick={() => {
                  const empty = { baseUrl: "", apiKey: "", model: "" };
                  setAi(empty);
                  saveAiConfig(null);
                  window.dispatchEvent(new Event("nido-ai-changed"));
                  toast(t("ai.disabled"));
                }}
              >
                {t("ai.remove")}
              </button>
            </div>
            <p className="mt-3 text-xs text-muted">{t("ai.corsHint")}</p>
          </Section>
        </div>

        <div className="md:col-span-2">
          <Section title={t("about.title")}>
            <p className="text-sm text-muted">{t("about.text")}</p>
            <p className="mt-2 text-sm">
              <a
                className="font-semibold text-accent underline-offset-2 hover:underline"
                href="https://github.com/HMJ07/nido"
                target="_blank"
                rel="noreferrer"
              >
                github.com/HMJ07/nido
              </a>{" "}
              · MIT
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
