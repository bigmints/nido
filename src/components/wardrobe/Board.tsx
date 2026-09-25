"use client";

import { useDroppable } from "@dnd-kit/core";
import type { CSSProperties } from "react";
import type { Slots } from "@/lib/outfits/compose";
import type { Category, WardrobeItem } from "@/lib/outfits/types";
import { useApp } from "../AppProvider";
import { ItemVisual } from "../art";
import { Icon } from "../ui";

const POS: Record<Category, CSSProperties> = {
  outerwear: { left: "8%", top: "13%", width: "84%", zIndex: 1 },
  dress: { left: "20%", top: "14%", width: "60%", zIndex: 3 },
  top: { left: "24%", top: "14%", width: "52%", zIndex: 3 },
  bottom: { left: "26%", top: "43%", width: "48%", zIndex: 2 },
  shoes: { left: "30%", top: "77%", width: "40%", zIndex: 2 },
  accessory: { left: "68%", top: "38%", width: "28%", zIndex: 4 },
};

function Mannequin() {
  return (
    <svg viewBox="0 0 300 440" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <g
        className="fill-surface2 stroke-line"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        transform="translate(-22.5 -4) scale(1.15)"
      >
        <ellipse cx="150" cy="44" rx="22" ry="27" />
        <rect x="142" y="68" width="16" height="22" rx="6" />
        <path d="M104 96 C122 82 178 82 196 96 L204 150 C204 176 190 190 194 226 C198 250 206 262 208 278 L92 278 C94 262 102 250 106 226 C110 190 96 176 96 150 Z" />
        <path d="M98 100 C84 136 78 184 74 236" fill="none" strokeWidth="14" />
        <path d="M202 100 C216 136 222 184 226 236" fill="none" strokeWidth="14" />
        <path d="M128 280 L124 410" fill="none" strokeWidth="26" />
        <path d="M172 280 L176 410" fill="none" strokeWidth="26" />
      </g>
      <g className="stroke-line" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7">
        <path d="M150 20 c8 0 14 6 14 14" strokeDasharray="1 7" />
      </g>
    </svg>
  );
}

export function Board({
  slots,
  wardrobe,
  onRemove,
  droppable = true,
}: {
  slots: Slots;
  wardrobe: WardrobeItem[];
  onRemove?: (c: Category) => void;
  droppable?: boolean;
}) {
  const { t } = useApp();
  const { setNodeRef, isOver } = useDroppable({ id: "board", disabled: !droppable });
  const placed = (Object.entries(slots) as [Category, string][])
    .map(([c, id]) => ({ c, item: wardrobe.find((w) => w.id === id) }))
    .filter((x): x is { c: Category; item: WardrobeItem } => !!x.item);

  return (
    <div
      ref={setNodeRef}
      data-testid="board"
      className={`relative mx-auto aspect-[300/440] w-full max-w-[340px] overflow-hidden rounded-3xl border-2 border-dashed transition ${
        isOver ? "border-accent bg-rose" : "border-line bg-gradient-to-b from-surface to-rose/50"
      }`}
    >
      <Mannequin />
      {placed.length === 0 && (
        <p className="absolute inset-x-6 bottom-6 z-10 text-center text-xs font-medium text-muted">
          {t("builder.dropHint")}
        </p>
      )}
      {placed.map(({ c, item }) => (
        <div key={c} className="group absolute animate-pop" style={{ ...POS[c], aspectRatio: "1" }}>
          <ItemVisual
            item={item}
            className="h-full w-full rounded-lg object-contain drop-shadow-md"
          />
          {onRemove && (
            <button
              onClick={() => onRemove(c)}
              aria-label={`${t("common.remove")} ${item.name}`}
              className="absolute -right-1 -top-1 z-10 rounded-full bg-surface p-1 text-muted opacity-100 shadow-soft transition hover:text-ink sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            >
              <Icon name="x" className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/** Compact row of garment thumbnails for lists and suggestions. */
export function OutfitStrip({
  items,
  size = "h-16 w-16",
}: {
  items: WardrobeItem[];
  size?: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <div
          key={i.id}
          title={i.name}
          className={`${size} overflow-hidden rounded-xl border border-line bg-surface2 p-1`}
        >
          <ItemVisual item={i} className="h-full w-full rounded-lg object-contain" />
        </div>
      ))}
    </div>
  );
}
