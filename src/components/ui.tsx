"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const PATHS: Record<string, string> = {
  home: "M3 11.5 12 4l9 7.5M5.5 10v9.5a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V10",
  kitchen: "M6 3v8a3 3 0 0 0 3 3v7M9 3v6M12 3v8M17 21V3c-2.2 1.2-3.5 4-3.5 8h3.5",
  hanger:
    "M12 7a2 2 0 1 0-2-2M12 7v2.2L3.4 15.6A1.5 1.5 0 0 0 4.3 18.3h15.4a1.5 1.5 0 0 0 .9-2.7L12 9.2",
  settings:
    "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 13a7.6 7.6 0 0 0 0-2l2-1.5-2-3.4-2.3.9a7.5 7.5 0 0 0-1.7-1L15 3.5h-4l-.4 2.5a7.5 7.5 0 0 0-1.7 1l-2.3-.9-2 3.4 2 1.5a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.4 2.3-.9c.5.4 1.1.7 1.7 1l.4 2.5h4l.4-2.5c.6-.3 1.2-.6 1.7-1l2.3.9 2-3.4Z",
  plus: "M12 5v14M5 12h14",
  check: "M5 12.5 10 17.5 19 7",
  x: "M6 6l12 12M18 6 6 18",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  camera: "M4 8h3l1.5-2h7L17 8h3v11H4ZM12 16.5a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z",
  sparkle:
    "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8ZM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8Z",
  copy: "M8 8h11v12H8ZM5 16V4h11",
  download: "M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14",
  upload: "M12 16V5M7.5 9.5 12 5l4.5 4.5M5 20h14",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2",
  fridge:
    "M7 3h10a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM6 10.5h12M9 6.5v2M9 13v3",
  calendar: "M4 6h16v14H4ZM4 10h16M8 3v4M16 3v4",
  cart: "M3 4h2.5l2 11h10L20 7H6.5M9.5 20h.01M16.5 20h.01",
  chevronL: "M15 5l-7 7 7 7",
  chevronR: "M9 5l7 7-7 7",
  pin: "M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 1 1 13 0c0 5.4-6.5 11-6.5 11ZM12 12.3a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6Z",
  drag: "M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4",
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z",
  refresh: "M20 11a8 8 0 0 0-14.6-3M4 5v3.5h3.5M4 13a8 8 0 0 0 14.6 3M20 19v-3.5h-3.5",
};

export function Icon({
  name,
  className = "h-5 w-5",
  strokeWidth = 1.8,
}: {
  name: keyof typeof PATHS | string;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[name] ?? ""} />
    </svg>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-in mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { id: T; label: string; icon?: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="no-scrollbar mb-5 flex gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1 shadow-soft"
    >
      {tabs.map((tb) => {
        const on = tb.id === value;
        return (
          <button
            key={tb.id}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(tb.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition ${
              on ? "bg-accent text-accent-ink shadow-soft" : "text-muted hover:text-ink"
            }`}
          >
            {tb.icon && <Icon name={tb.icon} className="h-4 w-4" />}
            {tb.label}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({
  emoji,
  title,
  text,
  children,
}: {
  emoji: string;
  title: string;
  text?: string;
  children?: ReactNode;
}) {
  return (
    <div className="card animate-pop flex flex-col items-center gap-2 border-dashed px-6 py-10 text-center">
      <div className="text-5xl" aria-hidden="true">
        {emoji}
      </div>
      <h3 className="text-xl font-semibold">{title}</h3>
      {text && <p className="max-w-sm text-sm text-muted">{text}</p>}
      {children && <div className="mt-3 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}

/** Modal that becomes a bottom sheet on phones. Closes with Escape or a backdrop click. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  // Portal to <body>: some pages wrap this component in an "animate-rise" ancestor
  // whose CSS animation leaves a non-"none" transform behind once it finishes. Any
  // transform on an ancestor turns it into the containing block for our fixed-position
  // overlay below, shrinking it to that ancestor's box instead of the full viewport
  // (very visible, and barely usable, on phones). Rendering into <body> sidesteps that
  // regardless of where <Sheet> is used from.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    if (!ref.current?.contains(document.activeElement)) ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [open]);
  if (!open || !mounted) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`animate-pop relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-lift outline-none sm:rounded-3xl ${
          wide ? "sm:max-w-3xl" : "sm:max-w-lg"
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="btn btn-soft !min-h-[36px] !px-2.5"
            aria-label="Close"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function Toast({ message }: { message: string | null }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 lg:bottom-8"
    >
      {message && (
        <div className="animate-pop rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-bg shadow-lift">
          {message}
        </div>
      )}
    </div>
  );
}

export function Logo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      <rect width="512" height="512" rx="120" fill="#c53868" />
      <ellipse cx="256" cy="292" rx="166" ry="34" fill="#dfb78f" />
      <ellipse cx="212" cy="246" rx="46" ry="60" fill="#fffaf2" transform="rotate(-8 212 246)" />
      <ellipse cx="302" cy="254" rx="42" ry="55" fill="#f7c5d6" transform="rotate(10 302 254)" />
      <path d="M90 292 Q256 350 422 292 C414 384 344 430 256 430 S98 384 90 292 Z" fill="#fbecd9" />
      <g fill="none" stroke="#c8895f" strokeWidth="9" strokeLinecap="round" opacity=".8">
        <path d="M118 326 Q256 392 394 326" />
        <path d="M138 366 Q256 424 374 366" />
      </g>
    </svg>
  );
}
