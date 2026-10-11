"use client";

import * as RTabs from "@radix-ui/react-tabs";
import type { ReactNode } from "react";

export interface TabDef {
  value: string;
  label: string;
  count?: number;
  content: ReactNode;
}

/** Underlined tabs that scroll sideways on narrow screens. */
export function Tabs({ tabs, defaultValue }: { tabs: TabDef[]; defaultValue?: string }) {
  return (
    <RTabs.Root defaultValue={defaultValue ?? tabs[0]?.value}>
      <RTabs.List className="-mx-4 mb-5 flex gap-6 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
        {tabs.map((t) => (
          <RTabs.Trigger
            key={t.value}
            value={t.value}
            className="relative flex h-11 shrink-0 items-center gap-2 text-[15px] font-semibold text-muted transition-colors hover:text-ink data-[state=active]:text-ink data-[state=active]:after:absolute data-[state=active]:after:inset-x-0 data-[state=active]:after:-bottom-px data-[state=active]:after:h-[3px] data-[state=active]:after:rounded-full data-[state=active]:after:bg-cta"
          >
            {t.label}
            {t.count !== undefined && (
              <span className="rounded-full bg-subtle px-2 py-0.5 text-xs text-ink-soft tabular-nums">
                {t.count}
              </span>
            )}
          </RTabs.Trigger>
        ))}
      </RTabs.List>
      {tabs.map((t) => (
        <RTabs.Content key={t.value} value={t.value} className="focus-visible:outline-none">
          {t.content}
        </RTabs.Content>
      ))}
    </RTabs.Root>
  );
}
