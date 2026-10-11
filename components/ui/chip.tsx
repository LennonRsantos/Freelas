import { Check } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

/** Toggleable tag. Used for specialties, filters and feedback tags. */
export function Chip({ selected, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
        selected
          ? "border-inverse bg-inverse text-on-inverse"
          : "border-line bg-card text-ink hover:border-ink/40",
        className,
      )}
      {...props}
    >
      {selected && <Check className="size-3.5" aria-hidden />}
      {children}
    </button>
  );
}
