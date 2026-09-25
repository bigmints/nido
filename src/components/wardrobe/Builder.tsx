"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useState } from "react";
import {
  idsToSlots,
  isComplete,
  placeItem,
  removeSlot,
  slotsToIds,
  type Slots,
} from "@/lib/outfits/compose";
import {
  CATEGORIES,
  OCCASIONS,
  type Category,
  type Occasion,
  type WardrobeItem,
} from "@/lib/outfits/types";
import { uid, useApp } from "../AppProvider";
import { ItemVisual } from "../art";
import { EmptyState, Icon } from "../ui";
import { Board, OutfitStrip } from "./Board";

const collision: CollisionDetection = (args) => {
  const p = pointerWithin(args);
  return p.length ? p : rectIntersection(args);
};

function DraggableItem({
  item,
  selected,
  onAdd,
}: {
  item: WardrobeItem;
  selected: boolean;
  onAdd: () => void;
}) {
  const { t } = useApp();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `item:${item.id}`,
    data: { item },
  });
  return (
    <div className={`relative ${isDragging ? "opacity-40" : ""}`}>
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        aria-label={`${item.name}. ${t("builder.dragItem")}`}
        className={`touch-manipulation cursor-grab overflow-hidden rounded-xl border bg-surface2 p-1.5 ${selected ? "border-accent ring-2 ring-accent/40" : "border-line"}`}
      >
        <ItemVisual
          item={item}
          className="pointer-events-none aspect-square w-full rounded-lg object-contain"
        />
      </div>
      <button
        onClick={onAdd}
        aria-label={`${t("builder.wear")} ${item.name}`}
        className="absolute -bottom-1 -right-1 rounded-full bg-accent p-1.5 text-accent-ink shadow-soft transition hover:scale-110"
      >
        <Icon name="plus" className="h-3 w-3" strokeWidth={3} />
      </button>
    </div>
  );
}

export function Builder() {
  const { t, data, update, toast } = useApp();
  const [slots, setSlots] = useState<Slots>({});
  const [name, setName] = useState("");
  const [occasion, setOccasion] = useState<Occasion>("casual");
  const [filter, setFilter] = useState<Category | "all">("all");
  const [dragging, setDragging] = useState<WardrobeItem | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const place = (item: WardrobeItem) => setSlots((s) => placeItem(s, item));
  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    if (e.over?.id === "board") {
      const item = e.active.data.current?.item as WardrobeItem | undefined;
      if (item) place(item);
    }
  };

  const items = data.wardrobe.filter((i) => filter === "all" || i.category === filter);
  const selectedIds = new Set(slotsToIds(slots));
  const complete = isComplete(slots);

  const save = () => {
    const ids = slotsToIds(slots);
    update("outfits", (o) => [
      ...o,
      {
        id: uid(),
        name: name.trim() || t("builder.defaultName", { n: o.length + 1 }),
        itemIds: ids,
        occasion,
        createdAt: Date.now(),
      },
    ]);
    toast(t("builder.saved"));
    setSlots({});
    setName("");
  };

  if (data.wardrobe.length === 0) {
    return (
      <EmptyState emoji="🪞" title={t("builder.empty.title")} text={t("builder.empty.text")} />
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={(e) => setDragging((e.active.data.current?.item as WardrobeItem) ?? null)}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
        <div className="space-y-3 lg:sticky lg:top-6 lg:self-start">
          <Board
            slots={slots}
            wardrobe={data.wardrobe}
            onRemove={(c) => setSlots((s) => removeSlot(s, c))}
          />
          <div className="card space-y-3 p-3.5">
            <div>
              <label className="label" htmlFor="outfit-name">
                {t("builder.name")}
              </label>
              <input
                id="outfit-name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("builder.namePh")}
              />
            </div>
            <div>
              <span className="label">{t("builder.occasion")}</span>
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
            <div className="flex gap-2">
              <button className="btn btn-primary flex-1" disabled={!complete} onClick={save}>
                <Icon name="heart" className="h-4 w-4" /> {t("builder.save")}
              </button>
              <button
                className="btn btn-outline"
                onClick={() => setSlots({})}
                disabled={selectedIds.size === 0}
              >
                {t("builder.clear")}
              </button>
            </div>
            {!complete && <p className="text-xs text-muted">{t("builder.needComplete")}</p>}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <div
              className="no-scrollbar mb-3 flex gap-1.5 overflow-x-auto"
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
            <p className="mb-2 text-xs text-muted">{t("builder.hint")}</p>
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-5">
              {items.map((i) => (
                <li key={i.id}>
                  <DraggableItem item={i} selected={selectedIds.has(i.id)} onAdd={() => place(i)} />
                </li>
              ))}
            </ul>
          </div>

          <section>
            <h3 className="mb-3 text-xl font-semibold">{t("builder.saved.title")}</h3>
            {data.outfits.length === 0 ? (
              <p className="text-sm text-muted">{t("builder.saved.empty")}</p>
            ) : (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {data.outfits.map((o) => {
                  const its = o.itemIds
                    .map((id) => data.wardrobe.find((w) => w.id === id))
                    .filter((x): x is WardrobeItem => !!x);
                  return (
                    <li key={o.id} className="card flex flex-col gap-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-display text-lg font-semibold leading-tight">
                            {o.name}
                          </div>
                          {o.occasion && (
                            <span className="text-xs text-muted">
                              {t(`occasion.${o.occasion}`)}
                            </span>
                          )}
                        </div>
                        <button
                          className="rounded-full p-1.5 text-muted hover:bg-surface2 hover:text-ink"
                          aria-label={`${t("common.delete")} ${o.name}`}
                          onClick={() => {
                            update("outfits", (l) => l.filter((x) => x.id !== o.id));
                            update("outfitCalendar", (c) =>
                              Object.fromEntries(Object.entries(c).filter(([, id]) => id !== o.id)),
                            );
                          }}
                        >
                          <Icon name="trash" className="h-4 w-4" />
                        </button>
                      </div>
                      <OutfitStrip items={its} size="h-14 w-14" />
                      <button
                        className="btn btn-soft self-start !min-h-[34px] !text-xs"
                        onClick={() => setSlots(idsToSlots(o.itemIds, data.wardrobe))}
                      >
                        {t("builder.load")}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
      <DragOverlay dropAnimation={{ duration: 180 }}>
        {dragging ? (
          <div className="h-24 w-24 rotate-3 rounded-xl border border-accent bg-surface p-2 shadow-lift">
            <ItemVisual item={dragging} className="h-full w-full object-contain" />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
