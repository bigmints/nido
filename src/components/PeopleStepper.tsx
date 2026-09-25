"use client";

import { MAX_PEOPLE, MIN_PEOPLE } from "@/lib/people";
import { useApp } from "./AppProvider";

/** Small − n + control for the number of people eating on one day. */
export function PeopleStepper({
  value,
  onChange,
  compact = false,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  compact?: boolean;
  label: string;
}) {
  const { t } = useApp();
  const btn = compact ? "!min-h-[26px] !px-2 !text-xs" : "!min-h-[32px] !px-3";
  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5"
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        className={`btn btn-soft ${btn}`}
        aria-label={t("people.less")}
        disabled={value <= MIN_PEOPLE}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <span
        className="min-w-[2.25rem] text-center text-xs font-semibold"
        data-testid="people-count"
        title={label}
      >
        👥 {value}
      </span>
      <button
        type="button"
        className={`btn btn-soft ${btn}`}
        aria-label={t("people.more")}
        disabled={value >= MAX_PEOPLE}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}
