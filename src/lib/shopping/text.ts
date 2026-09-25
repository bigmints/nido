import { formatQty } from "./units";
import type { ShoppingSection } from "./build";
import type { Section } from "../recipes/types";

/** Plain-text export (for clipboard / messaging apps). */
export function shoppingToText(
  list: ShoppingSection[],
  sectionLabel: (s: Section) => string,
  opts: { checked?: Record<string, boolean>; title?: string; imperial?: boolean } = {},
): string {
  const lines: string[] = [];
  if (opts.title) lines.push(opts.title, "");
  for (const s of list) {
    lines.push(sectionLabel(s.section).toUpperCase());
    for (const i of s.items) {
      const mark = opts.checked?.[i.key] ? "[x]" : "[ ]";
      const qty = i.unit === "pizca" ? "" : ` (${formatQty(i.qty, i.unit, opts.imperial)})`;
      lines.push(`${mark} ${i.name}${qty}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim() + "\n";
}
