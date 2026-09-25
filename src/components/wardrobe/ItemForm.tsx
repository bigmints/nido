"use client";

import { useEffect, useRef, useState } from "react";
import { COLORS } from "@/lib/outfits/colors";
import {
  CATEGORIES,
  SEASONS,
  TAG_OPEN,
  TAG_SPORT,
  TAG_WATERPROOF,
  type Category,
  type Formality,
  type Season,
  type WardrobeItem,
} from "@/lib/outfits/types";
import type { TKey } from "@/lib/i18n";
import { compressImage } from "@/lib/storage/image";
import { uid, useApp } from "../AppProvider";
import { GarmentArt, usePhoto } from "../art";
import { Icon, Sheet } from "../ui";

const QUICK_TAGS: string[] = [TAG_SPORT, TAG_WATERPROOF, TAG_OPEN];

export function ItemForm({
  item,
  open,
  onClose,
}: {
  item: WardrobeItem | null; // null = new
  open: boolean;
  onClose: () => void;
}) {
  const { t, update, savePhoto, removePhoto, toast } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("top");
  const [colors, setColors] = useState<string[]>(["blanco"]);
  const [warmth, setWarmth] = useState<WardrobeItem["warmth"]>(2);
  const [formality, setFormality] = useState<Formality>("casual");
  const [seasons, setSeasons] = useState<Season[]>(["spring", "autumn"]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagText, setTagText] = useState("");
  const [photoId, setPhotoId] = useState<string | undefined>();
  const [pending, setPending] = useState<string | undefined>(); // compressed photo not yet stored
  const stored = usePhoto(photoId);
  const preview = pending ?? stored;

  useEffect(() => {
    if (!open) return;
    setName(item?.name ?? "");
    setCategory(item?.category ?? "top");
    setColors(item?.colors ?? ["blanco"]);
    setWarmth(item?.warmth ?? 2);
    setFormality(item?.formality ?? "casual");
    setSeasons(item?.seasons ?? ["spring", "autumn"]);
    setTags(item?.tags ?? []);
    setPhotoId(item?.photoId);
    setPending(undefined);
    setTagText("");
  }, [open, item]);

  const toggle = <T,>(list: T[], v: T) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  const onFile = async (f?: File) => {
    if (!f) return;
    try {
      setPending(await compressImage(f, 900, 0.8));
    } catch {
      toast(t("photo.error"));
    }
  };

  const save = async () => {
    const finalName = name.trim() || t(`cat.${category}`);
    let pid = photoId;
    if (pending) {
      if (pid) await removePhoto(pid);
      pid = await savePhoto(pending);
    }
    const next: WardrobeItem = {
      id: item?.id ?? uid(),
      name: finalName,
      category,
      colors: colors.length ? colors : ["gris"],
      warmth,
      formality,
      seasons,
      tags,
      photoId: pid,
    };
    update("wardrobe", (w) => (item ? w.map((x) => (x.id === item.id ? next : x)) : [...w, next]));
    toast(t("wardrobe.saved"));
    onClose();
  };

  const remove = async () => {
    if (!item) return;
    if (item.photoId) await removePhoto(item.photoId);
    update("wardrobe", (w) => w.filter((x) => x.id !== item.id));
    update("outfits", (o) =>
      o.map((x) => ({ ...x, itemIds: x.itemIds.filter((id) => id !== item.id) })),
    );
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={item ? t("wardrobe.edit") : t("wardrobe.add")}>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-28 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-line bg-surface2">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="h-full w-full object-cover" />
            ) : (
              <GarmentArt category={category} color={colors[0] ?? "gris"} className="h-20 w-20" />
            )}
          </div>
          <div className="space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label={t("wardrobe.photo")}
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
            <button className="btn btn-soft" onClick={() => fileRef.current?.click()}>
              <Icon name="camera" className="h-4 w-4" /> {t("wardrobe.photo")}
            </button>
            <p className="text-xs text-muted">{t("photo.local")}</p>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="item-name">
            {t("wardrobe.name")}
          </label>
          <input
            id="item-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("wardrobe.namePh")}
          />
        </div>

        <div>
          <span className="label">{t("wardrobe.category")}</span>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
                className={`chip ${category === c ? "chip-on" : "hover:bg-surface2"}`}
              >
                {t(`cat.${c}`)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">
            {t("wardrobe.colors")}{" "}
            <span className="normal-case tracking-normal">({t("wardrobe.colorsHint")})</span>
          </span>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => {
              const idx = colors.indexOf(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => setColors((cur) => toggle(cur, c.id))}
                  aria-pressed={idx >= 0}
                  aria-label={t(`color.${c.id}` as TKey)}
                  title={t(`color.${c.id}` as TKey)}
                  className={`relative h-9 w-9 rounded-full border-2 transition ${idx >= 0 ? "scale-110 border-accent shadow-soft" : "border-line"}`}
                  style={{ background: c.hex }}
                >
                  {idx === 0 && (
                    <span className="absolute -right-1 -top-1 rounded-full bg-accent px-1 text-[9px] font-bold text-accent-ink">
                      1
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <span className="label">{t("wardrobe.warmth")}</span>
            <div className="flex gap-1" role="group" aria-label={t("wardrobe.warmth")}>
              {([1, 2, 3, 4, 5] as const).map((n) => (
                <button
                  key={n}
                  aria-pressed={warmth === n}
                  onClick={() => setWarmth(n)}
                  className={`btn flex-1 !min-h-[38px] !px-0 ${warmth === n ? "btn-primary" : "btn-soft"}`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-muted">{t("wardrobe.warmthHint")}</p>
          </div>
          <div>
            <span className="label">{t("wardrobe.formality")}</span>
            <div className="flex gap-1">
              {(["casual", "smart", "formal"] as Formality[]).map((f) => (
                <button
                  key={f}
                  aria-pressed={formality === f}
                  onClick={() => setFormality(f)}
                  className={`btn flex-1 !min-h-[38px] !px-2 ${formality === f ? "btn-primary" : "btn-soft"}`}
                >
                  {t(`formality.${f}`)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <span className="label">{t("wardrobe.seasons")}</span>
          <div className="flex flex-wrap gap-1.5">
            {SEASONS.map((s) => (
              <button
                key={s}
                aria-pressed={seasons.includes(s)}
                onClick={() => setSeasons((c) => toggle(c, s))}
                className={`chip ${seasons.includes(s) ? "chip-on" : "hover:bg-surface2"}`}
              >
                {t(`season.${s}`)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">{t("wardrobe.tags")}</span>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TAGS.map((tg) => (
              <button
                key={tg}
                aria-pressed={tags.includes(tg)}
                onClick={() => setTags((c) => toggle(c, tg))}
                className={`chip ${tags.includes(tg) ? "chip-on" : "hover:bg-surface2"}`}
              >
                {t(`tag.${tg}` as TKey)}
              </button>
            ))}
            {tags
              .filter((x) => !QUICK_TAGS.includes(x))
              .map((tg) => (
                <button
                  key={tg}
                  onClick={() => setTags((c) => c.filter((x) => x !== tg))}
                  className="chip chip-on"
                >
                  {tg} <Icon name="x" className="h-3 w-3" />
                </button>
              ))}
          </div>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const v = tagText.trim().toLowerCase();
              if (v && !tags.includes(v)) setTags((c) => [...c, v]);
              setTagText("");
            }}
          >
            <input
              className="input"
              aria-label={t("wardrobe.tags")}
              value={tagText}
              onChange={(e) => setTagText(e.target.value)}
              placeholder={t("wardrobe.tagPh")}
            />
            <button className="btn btn-soft" type="submit">
              {t("common.add")}
            </button>
          </form>
        </div>

        <div className="flex flex-wrap justify-between gap-2 pt-2">
          {item ? (
            <button className="btn btn-danger" onClick={() => void remove()}>
              <Icon name="trash" className="h-4 w-4" /> {t("common.delete")}
            </button>
          ) : (
            <span />
          )}
          <button className="btn btn-primary" onClick={() => void save()}>
            <Icon name="check" className="h-4 w-4" /> {t("common.save")}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
