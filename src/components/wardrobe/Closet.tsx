"use client";

import { useState } from "react";
import { CATEGORIES, type Category, type WardrobeItem } from "@/lib/outfits/types";
import { useApp } from "../AppProvider";
import { ItemVisual } from "../art";
import { EmptyState, Icon } from "../ui";
import { ItemForm } from "./ItemForm";

export function Closet() {
  const { t, data, loadDemo, toast } = useApp();
  const [filter, setFilter] = useState<Category | "all">("all");
  const [editing, setEditing] = useState<WardrobeItem | null>(null);
  const [open, setOpen] = useState(false);

  const items = data.wardrobe.filter((i) => filter === "all" || i.category === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="no-scrollbar flex gap-1.5 overflow-x-auto"
          role="group"
          aria-label={t("wardrobe.category")}
        >
          {(["all", ...CATEGORIES] as const).map((c) => (
            <button
              key={c}
              aria-pressed={filter === c}
              onClick={() => setFilter(c)}
              className={`chip whitespace-nowrap ${filter === c ? "chip-on" : "hover:bg-surface2"}`}
            >
              {c === "all" ? t("common.all") : t(`cat.${c}`)}
            </button>
          ))}
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Icon name="plus" className="h-4 w-4" /> {t("wardrobe.add")}
        </button>
      </div>

      {data.wardrobe.length === 0 ? (
        <EmptyState emoji="👗" title={t("wardrobe.empty.title")} text={t("wardrobe.empty.text")}>
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Icon name="camera" className="h-4 w-4" /> {t("wardrobe.add")}
          </button>
          <button
            className="btn btn-soft"
            onClick={() => void loadDemo().then(() => toast(t("demo.loaded")))}
          >
            <Icon name="sparkle" className="h-4 w-4" /> {t("demo.load")}
          </button>
        </EmptyState>
      ) : items.length === 0 ? (
        <EmptyState emoji="🔍" title={t("wardrobe.noneInCat")} />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((i) => (
            <li key={i.id}>
              <button
                onClick={() => {
                  setEditing(i);
                  setOpen(true);
                }}
                className="card group flex w-full flex-col overflow-hidden text-left transition hover:-translate-y-0.5 hover:shadow-lift"
              >
                <div className="flex aspect-square items-center justify-center bg-gradient-to-br from-rose/60 to-butter/50 p-3">
                  <ItemVisual
                    item={i}
                    className="h-full w-full rounded-lg object-contain transition group-hover:scale-105"
                  />
                </div>
                <div className="p-2.5">
                  <div className="truncate text-sm font-semibold">{i.name}</div>
                  <div className="text-xs text-muted">
                    {t(`cat.${i.category}`)} · {t(`formality.${i.formality}`)}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      <ItemForm item={editing} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
