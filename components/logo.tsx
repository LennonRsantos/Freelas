import { cn } from "@/lib/utils";

export function Logo({
  tone = "dark",
  compact,
  className,
}: {
  tone?: "dark" | "light";
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline font-display font-extrabold tracking-tight",
        compact ? "text-xl" : "text-2xl",
        tone === "light" ? "text-white" : "text-ink",
        className,
      )}
    >
      Freelas<span className="text-cta">.</span>
    </span>
  );
}
