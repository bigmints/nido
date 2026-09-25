"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import type { TKey } from "@/lib/i18n";
import { useApp } from "./AppProvider";
import { Icon, Logo, Toast } from "./ui";

const NAV: { href: string; key: TKey; icon: string }[] = [
  { href: "/", key: "nav.home", icon: "home" },
  { href: "/cocina/", key: "nav.kitchen", icon: "kitchen" },
  { href: "/armario/", key: "nav.wardrobe", icon: "hanger" },
  { href: "/ajustes/", key: "nav.settings", icon: "settings" },
];

export function Shell({ children, basePath }: { children: ReactNode; basePath: string }) {
  const { ready, t, toastMsg } = useApp();
  const path = (usePathname() || "/").replace(/\/?$/, "/");

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register(`${basePath}/sw.js`, { scope: `${basePath}/` })
        .catch(() => {});
    }
  }, [basePath]);

  if (!ready) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center"
        aria-busy="true"
        aria-label="Nido"
      >
        <Logo className="h-16 w-16 animate-pulse" />
      </div>
    );
  }

  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only z-[70] rounded-full bg-accent px-4 py-2 text-accent-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t("nav.skip")}
      </a>

      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface/80 p-5 backdrop-blur lg:flex">
        <Link href="/" className="mb-8 flex items-center gap-3">
          <Logo />
          <span className="font-display text-2xl font-semibold">Nido</span>
        </Link>
        <nav aria-label={t("nav.main")} className="flex flex-col gap-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={isActive(n.href) ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                isActive(n.href)
                  ? "bg-accent text-accent-ink shadow-soft"
                  : "text-muted hover:bg-surface2 hover:text-ink"
              }`}
            >
              <Icon name={n.icon} />
              {t(n.key)}
            </Link>
          ))}
        </nav>
        <p className="mt-auto text-xs leading-relaxed text-muted">{t("nav.tagline")}</p>
      </aside>

      <main
        id="main"
        className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pl-72 lg:pr-8 lg:pt-10"
      >
        <div className="lg:mx-auto lg:max-w-5xl">{children}</div>
      </main>

      {/* mobile bottom tab bar */}
      <nav
        aria-label={t("nav.main")}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="mx-auto flex max-w-md items-stretch justify-around px-2">
          {NAV.map((n) => (
            <li key={n.href} className="flex-1">
              <Link
                href={n.href}
                aria-current={isActive(n.href) ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold transition ${
                  isActive(n.href) ? "text-accent" : "text-muted"
                }`}
              >
                <span
                  className={`flex h-8 w-14 items-center justify-center rounded-full transition ${
                    isActive(n.href) ? "bg-rose" : ""
                  }`}
                >
                  <Icon name={n.icon} className="h-[22px] w-[22px]" />
                </span>
                {t(n.key)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <Toast message={toastMsg} />
    </div>
  );
}
