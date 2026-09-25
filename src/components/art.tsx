"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { colorHex } from "@/lib/outfits/colors";
import type { Category, WardrobeItem } from "@/lib/outfits/types";
import type { Recipe } from "@/lib/recipes/types";
import { useApp } from "./AppProvider";

/** Load a stored photo (data URL) by id. */
export function usePhoto(id?: string): string | undefined {
  const { getPhoto } = useApp();
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let alive = true;
    if (!id) {
      setUrl(undefined);
      return;
    }
    getPhoto(id).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [id, getPhoto]);
  return url;
}

/** Tasteful generated card for a recipe: gradient + emoji, or the user's own photo. */
export function RecipeArt({ recipe, className = "" }: { recipe: Recipe; className?: string }) {
  const photo = usePhoto(`recipe:${recipe.id}`);
  return (
    <div
      className={`recipe-art relative flex items-center justify-center overflow-hidden ${className}`}
      style={{ "--h": recipe.hue } as CSSProperties}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="select-none text-5xl drop-shadow-sm" aria-hidden="true">
          {recipe.emoji}
        </span>
      )}
    </div>
  );
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v + amt * (amt > 0 ? 255 - v : v))));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `rgb(${r} ${g} ${b})`;
}

const SHAPES: Record<Category, string[]> = {
  top: [
    "M30 18 L42 12 Q50 22 58 12 L70 18 L86 36 L75 45 L69 39 L69 86 L31 86 L31 39 L25 45 L14 36 Z",
  ],
  bottom: ["M29 12 H71 L76 90 H55 L50 44 L45 90 H24 Z"],
  dress: ["M39 8 L45 8 Q50 20 55 8 L61 8 L65 32 L78 90 H22 L35 32 Z"],
  outerwear: [
    "M31 10 L44 8 L50 24 L56 8 L69 10 L88 42 L80 55 L73 48 L73 90 H27 L27 48 L20 55 L12 42 Z",
  ],
  shoes: ["M10 60 Q10 42 28 42 L36 42 Q42 54 58 55 L74 57 Q92 60 92 70 V76 H10 Z"],
  accessory: ["M24 42 H76 L82 88 H18 Z"],
};

/** Simple generated garment illustration, tinted with the item's primary color. */
export function GarmentArt({
  category,
  color,
  className = "",
}: {
  category: Category;
  color: string;
  className?: string;
}) {
  const fill = colorHex(color);
  const stroke = shade(fill, -0.28);
  const gid = `g-${category}-${color}`;
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={shade(fill, 0.18)} />
          <stop offset="1" stopColor={fill} />
        </linearGradient>
      </defs>
      {category === "accessory" && (
        <path
          d="M36 42 Q36 20 50 20 Q64 20 64 42"
          fill="none"
          stroke={stroke}
          strokeWidth="4"
          strokeLinecap="round"
        />
      )}
      {SHAPES[category].map((d) => (
        <path
          key={d}
          d={d}
          fill={`url(#${gid})`}
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      ))}
      {category === "top" && (
        <path d="M42 12 Q50 24 58 12" fill="none" stroke={stroke} strokeWidth="2" />
      )}
      {category === "bottom" && <path d="M29 20 H71" stroke={stroke} strokeWidth="2" />}
      {category === "dress" && <path d="M36 32 H64" stroke={stroke} strokeWidth="2" />}
      {category === "outerwear" && (
        <>
          <path d="M50 24 V90" stroke={stroke} strokeWidth="2" />
          <path
            d="M44 8 L50 24 L38 36 Z M56 8 L50 24 L62 36 Z"
            fill={shade(fill, -0.1)}
            stroke={stroke}
            strokeWidth="1.5"
          />
        </>
      )}
      {category === "shoes" && (
        <>
          <path
            d="M10 70 H92 V78 Q92 80 90 80 H12 Q10 80 10 78 Z"
            fill="#fffdf8"
            stroke={stroke}
            strokeWidth="2"
          />
          <path
            d="M34 47 L40 53 M42 50 L48 56"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

/** A wardrobe item as its photo, or a generated illustration when no photo exists. */
export function ItemVisual({ item, className = "" }: { item: WardrobeItem; className?: string }) {
  const photo = usePhoto(item.photoId);
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt={item.name} className={`object-cover ${className}`} />;
  }
  return (
    <GarmentArt category={item.category} color={item.colors[0] ?? "gris"} className={className} />
  );
}
