import { initials } from "@/lib/core/logic";
import { cn } from "@/lib/utils";

const HUES = [
  "bg-sky-100 text-sky-800",
  "bg-amber-100 text-amber-900",
  "bg-emerald-100 text-emerald-800",
  "bg-rose-100 text-rose-800",
  "bg-violet-100 text-violet-800",
  "bg-orange-100 text-orange-900",
];

function hueFor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return HUES[h % HUES.length];
}

export function Avatar({
  name,
  src,
  size = 44,
  square,
  className,
}: {
  name: string;
  src?: string;
  size?: number;
  square?: boolean;
  className?: string;
}) {
  const shape = square ? "rounded-xl" : "rounded-full";
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={cn("shrink-0 object-cover", shape, className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center font-display font-bold",
        shape,
        hueFor(name),
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  );
}
