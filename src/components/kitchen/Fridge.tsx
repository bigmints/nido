"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AiError, chat, friendlyError, isConfigured, parseAiRecipe, recipePrompt } from "@/lib/ai";
import { cap } from "@/lib/text";
import { canon, catalogNames } from "@/lib/recipes/catalog";
import { rankRecipes } from "@/lib/recipes/match";
import type { Diet, Recipe } from "@/lib/recipes/types";
import { useApp } from "../AppProvider";
import { useAiConfig } from "../hooks";
import { EmptyState, Icon } from "../ui";
import { RecipeCard } from "./RecipeCard";

const QUICK = [
  "huevo",
  "tomate",
  "cebolla",
  "patata",
  "pechuga de pollo",
  "arroz",
  "queso rallado",
  "espinacas",
  "leche",
  "pasta",
];

function Combobox({ onAdd }: { onAdd: (name: string) => void }) {
  const { t } = useApp();
  const [text, setText] = useState("");
  const [active, setActive] = useState(-1);
  const names = useMemo(() => catalogNames(), []);
  const q = canon(text);
  const options = useMemo(
    () => (q ? names.filter((n) => canon(n).includes(q)).slice(0, 6) : []),
    [names, q],
  );

  const commit = (value: string) => {
    const v = value.trim();
    if (!v) return;
    onAdd(v);
    setText("");
    setActive(-1);
  };

  return (
    <div className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          commit(active >= 0 && options[active] ? options[active] : text);
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <label htmlFor="fridge-input" className="sr-only">
            {t("fridge.add")}
          </label>
          <input
            id="fridge-input"
            role="combobox"
            aria-expanded={options.length > 0}
            aria-controls="fridge-options"
            aria-autocomplete="list"
            autoComplete="off"
            className="input"
            placeholder={t("fridge.placeholder")}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setActive(-1);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(options.length - 1, a + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(-1, a - 1));
              } else if (e.key === "Escape") setText("");
            }}
          />
          {options.length > 0 && (
            <ul
              id="fridge-options"
              role="listbox"
              className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-line bg-surface shadow-lift"
            >
              {options.map((o, i) => (
                <li
                  key={o}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commit(o);
                  }}
                  className={`cursor-pointer px-3 py-2 text-sm first-letter:uppercase ${i === active ? "bg-rose" : "hover:bg-surface2"}`}
                >
                  {o}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button className="btn btn-primary" type="submit">
          <Icon name="plus" className="h-4 w-4" /> {t("common.add")}
        </button>
      </form>
    </div>
  );
}

export function Fridge({
  onOpen,
  onRecipeCreated,
}: {
  onOpen: (r: Recipe) => void;
  onRecipeCreated: (r: Recipe) => void;
}) {
  const { t, lang, data, update, recipes, loadDemo, toast } = useApp();
  const ai = useAiConfig();
  const [diets, setDiets] = useState<Diet[]>([]);
  const [busy, setBusy] = useState(false);
  const names = data.fridge.map((f) => f.name);

  const ranked = useMemo(() => rankRecipes(recipes, names, { diets }), [recipes, names, diets]);

  const add = (name: string) => {
    if (names.some((n) => canon(n) === canon(name))) return;
    update("fridge", (f) => [...f, { name: name.trim().toLowerCase() }]);
  };

  const generate = async () => {
    if (!isConfigured(ai)) return;
    setBusy(true);
    try {
      const text = await chat(ai, recipePrompt(names, lang));
      const recipe = parseAiRecipe(text);
      update("customRecipes", (r) => [...r, recipe]);
      toast(t("ai.recipeSaved"));
      onRecipeCreated(recipe);
    } catch (e) {
      const code = friendlyError(e);
      toast(t(`ai.err.${code}`));
      if (!(e instanceof AiError)) console.warn(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="card p-4 sm:p-5">
        <h2 className="mb-1 flex items-center gap-2 text-xl font-semibold">
          <Icon name="fridge" className="h-5 w-5 text-accent" /> {t("fridge.title")}
        </h2>
        <p className="mb-3 text-sm text-muted">{t("fridge.hint")}</p>
        <Combobox onAdd={add} />
        <ul className="mt-3 flex flex-wrap gap-2" aria-label={t("fridge.title")}>
          {data.fridge.map((f) => (
            <li key={f.name}>
              <span className="chip chip-on !gap-1.5">
                {cap(f.name)}
                <button
                  onClick={() => update("fridge", (l) => l.filter((x) => x.name !== f.name))}
                  aria-label={t("common.remove") + " " + f.name}
                  className="rounded-full p-0.5 hover:bg-white/25"
                >
                  <Icon name="x" className="h-3 w-3" />
                </button>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-muted">{t("fridge.quick")}</span>
          {QUICK.filter((q) => !names.some((n) => canon(n) === canon(q)))
            .slice(0, 7)
            .map((q) => (
              <button key={q} onClick={() => add(q)} className="chip hover:bg-surface2">
                + {cap(q)}
              </button>
            ))}
        </div>
      </section>

      {names.length === 0 ? (
        <EmptyState emoji="🧺" title={t("fridge.empty.title")} text={t("fridge.empty.text")}>
          <button
            className="btn btn-soft"
            onClick={() => void loadDemo().then(() => toast(t("demo.loaded")))}
          >
            <Icon name="sparkle" className="h-4 w-4" /> {t("demo.load")}
          </button>
        </EmptyState>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("recipes.diet")}>
              {(["vegetariano", "vegano", "sin-gluten"] as Diet[]).map((d) => {
                const on = diets.includes(d);
                return (
                  <button
                    key={d}
                    aria-pressed={on}
                    onClick={() =>
                      setDiets((cur) => (on ? cur.filter((x) => x !== d) : [...cur, d]))
                    }
                    className={`chip ${on ? "chip-on" : "hover:bg-surface2"}`}
                  >
                    {t(`diet.${d}`)}
                  </button>
                );
              })}
            </div>
            {isConfigured(ai) ? (
              <button className="btn btn-primary" onClick={generate} disabled={busy}>
                <Icon name="sparkle" className="h-4 w-4" />{" "}
                {busy ? t("ai.thinking") : t("ai.generateRecipe")}
              </button>
            ) : (
              <Link
                href="/ajustes/"
                className="text-xs text-muted underline-offset-2 hover:underline"
              >
                ✨ {t("ai.enableHint")}
              </Link>
            )}
          </div>
          <h2 className="text-xl font-semibold">{t("fridge.results", { n: ranked.length })}</h2>
          {ranked.length === 0 ? (
            <EmptyState emoji="🤔" title={t("fridge.none.title")} text={t("fridge.none.text")} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ranked.slice(0, 24).map((r) => (
                <RecipeCard key={r.recipe.id} recipe={r.recipe} ranked={r} onOpen={onOpen} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
