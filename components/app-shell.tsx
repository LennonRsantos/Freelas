"use client";

import {
  ChartColumn,
  ClipboardList,
  Megaphone,
  Search,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import type { ViewMode } from "@/lib/core/types";
import { useFreelas } from "@/lib/store/freelas-store";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { Toaster } from "./toaster";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Other paths that belong to this tab. */
  match?: string[];
  /** Highlighted as the main action (orange). */
  primary?: boolean;
}

/** One navigation for both sides. "Oferecer" appears once the user has a company. */
function navItems(hasCompany: boolean): NavItem[] {
  return [
    { href: "/vagas", label: "Procurar", icon: Search },
    { href: "/servicos", label: "Serviços", icon: ClipboardList },
    ...(hasCompany
      ? [
          {
            href: "/contratar",
            label: "Oferecer",
            icon: Megaphone,
            match: ["/publicar"],
            primary: true,
          },
        ]
      : []),
    { href: "/dashboard", label: "Dashboard", icon: ChartColumn },
    { href: "/perfil", label: "Perfil", icon: UserRound },
  ];
}

export const homeFor = (mode: ViewMode) => (mode === "freelancer" ? "/vagas" : "/contratar");

function isActive(pathname: string, item: NavItem) {
  return [item.href, ...(item.match ?? [])].some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { state } = useFreelas();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!state.user) router.replace("/entrar");
  }, [state.user, router]);

  if (!state.user) return null;
  const items = navItems(Boolean(state.user.contratante));

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_1fr] lg:grid-cols-[264px_1fr]">
      {/* Sidebar: tablet and desktop */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-8 bg-navy px-4 py-6 text-white md:flex">
        <Link href="/vagas" className="px-2">
          <Logo tone="light" />
        </Link>
        <nav aria-label="Principal" className="flex flex-col gap-1">
          {items.map((item) => {
            const { href, label, icon: Icon } = item;
            const active = isActive(pathname, item);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors",
                  active
                    ? "bg-white/10 text-white"
                    : "text-slate-300 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className={cn("size-5", active && "text-cta")} aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-3">
          <ThemeToggle variant="row" />
          <p className="px-2 text-sm text-slate-400">Seu freela na hora certa.</p>
        </div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col">
        {/* Header: phones */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-navy px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 md:hidden">
          <Link href="/vagas" aria-label="Freelas, procurar vagas">
            <Logo tone="light" compact />
          </Link>
          <ThemeToggle />
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-28 sm:px-6 md:px-8 md:pt-8 md:pb-12">
          {children}
        </main>
      </div>

      {/* Bottom navigation: phones */}
      <nav
        aria-label="Principal"
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 backdrop-blur md:hidden"
      >
        <ul className={cn("grid", items.length === 5 ? "grid-cols-5" : "grid-cols-4")}>
          {items.map((item) => {
            const { href, label, icon: Icon, primary } = item;
            const active = isActive(pathname, item);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                    active ? "text-ink" : "text-muted",
                  )}
                >
                  {primary ? (
                    <span className="-my-1 grid size-8 place-items-center rounded-lg bg-cta text-navy-deep">
                      <Icon className="size-[18px]" aria-hidden />
                    </span>
                  ) : (
                    <Icon
                      className={cn("size-6", active && "text-cta")}
                      strokeWidth={active ? 2.4 : 2}
                      aria-hidden
                    />
                  )}
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Toaster />
    </div>
  );
}
