"use client";

import { RotateCw } from "lucide-react";
import { useState } from "react";
import { useFreelas } from "@/lib/store/freelas-store";
import { cn } from "@/lib/utils";

/** Phone header: fetches jobs and applications again. Spins while loading. */
export function RefreshButton() {
  const { reload } = useFreelas();
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    // Keep the spin visible for a beat, even when the fetch is instant.
    await Promise.all([reload(), new Promise((r) => setTimeout(r, 600))]);
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={() => void run()}
      disabled={loading}
      aria-label={loading ? "Atualizando vagas" : "Atualizar vagas"}
      title="Atualizar vagas"
      className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-300 transition-colors hover:bg-white/10 hover:text-white disabled:text-slate-400"
    >
      <RotateCw className={cn("size-[18px]", loading && "animate-spin")} aria-hidden />
    </button>
  );
}
