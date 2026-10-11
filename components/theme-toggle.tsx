"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { THEME_EVENT as EVENT, THEME_STORAGE_KEY as STORAGE_KEY, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

function readTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // The choice still applies to this visit.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  // Follow the system setting until the person picks a theme.
  const media = matchMedia("(prefers-color-scheme: dark)");
  const onSystem = () => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {}
    if (saved) return;
    document.documentElement.dataset.theme = media.matches ? "dark" : "light";
    onChange();
  };
  media.addEventListener("change", onSystem);
  window.addEventListener(EVENT, onChange);
  return () => {
    media.removeEventListener("change", onSystem);
    window.removeEventListener(EVENT, onChange);
  };
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light" as Theme);
  return [theme, setTheme];
}

/**
 * Light/dark switch. "icon" fits the phone header; "row" is the labeled
 * sidebar version. Both sit on the navy surface.
 */
export function ThemeToggle({
  variant = "icon",
  className,
}: {
  variant?: "icon" | "row";
  className?: string;
}) {
  const [theme, set] = useTheme();
  const dark = theme === "dark";
  const Icon = dark ? Sun : Moon;
  const label = dark ? "Usar tema claro" : "Usar tema escuro";

  if (variant === "row") {
    return (
      <button
        type="button"
        onClick={() => set(dark ? "light" : "dark")}
        className={cn(
          "flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white",
          className,
        )}
      >
        <Icon className="size-5" aria-hidden />
        {dark ? "Tema claro" : "Tema escuro"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => set(dark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-xl text-slate-300 transition-colors hover:bg-white/10 hover:text-white",
        className,
      )}
    >
      <Icon className="size-5" aria-hidden />
    </button>
  );
}
