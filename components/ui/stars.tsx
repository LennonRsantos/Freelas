"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  count,
  size = "sm",
}: {
  value: number;
  count?: number;
  size?: "sm" | "md";
}) {
  if (count === 0) return <span className="text-sm text-muted">Sem avaliações</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Star
        className={cn("fill-warn text-warn", size === "sm" ? "size-4" : "size-5")}
        aria-hidden
      />
      <span className="font-semibold text-ink">{value.toFixed(1)}</span>
      {count !== undefined && <span className="text-muted">({count})</span>}
      <span className="sr-only">de 5 estrelas</span>
    </span>
  );
}

const LABELS = ["Ruim", "Fraco", "Ok", "Bom", "Excelente"];

export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        role="radiogroup"
        aria-label="Nota de 1 a 5"
        className="flex gap-1"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n)}
            className="rounded-lg p-1.5 transition-transform active:scale-90"
          >
            <Star
              className={cn(
                "size-9 transition-colors",
                n <= shown ? "fill-warn text-warn" : "text-line",
              )}
            />
          </button>
        ))}
      </div>
      <p className="h-5 text-sm font-medium text-muted">
        {shown ? LABELS[shown - 1] : "Toque para avaliar"}
      </p>
    </div>
  );
}

/** Five stars filled up to `value`, with partial fill for averages like 4.5. */
export function StarRow({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex gap-0.5", className)}
      role="img"
      aria-label={`${value.toLocaleString("pt-BR")} de 5 estrelas`}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = Math.min(1, Math.max(0, value - (n - 1)));
        return (
          <span key={n} className="relative size-4" aria-hidden>
            <Star className="absolute inset-0 size-4 text-line" />
            <span
              className="absolute inset-y-0 left-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star className="size-4 fill-warn text-warn" />
            </span>
          </span>
        );
      })}
    </span>
  );
}
