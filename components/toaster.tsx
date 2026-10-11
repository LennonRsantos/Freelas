"use client";

import { CheckCircle2 } from "lucide-react";
import { useFreelas } from "@/lib/store/freelas-store";

export function Toaster() {
  const { toasts } = useFreelas();
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:right-6 md:bottom-6 md:left-auto md:items-end"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="animate-toast-in pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-xl bg-navy px-4 py-3 text-sm font-medium text-white shadow-lg"
        >
          <CheckCircle2 className="size-5 shrink-0 text-ok" aria-hidden />
          {t.message}
        </div>
      ))}
    </div>
  );
}
