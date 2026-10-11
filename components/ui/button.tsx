import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "cta" | "primary" | "outline" | "ghost" | "success" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  // Navy text on orange: white on #FF6B00 fails WCAG AA.
  cta: "bg-cta text-navy-deep hover:bg-cta-hover active:bg-cta-hover",
  primary: "bg-inverse text-on-inverse hover:opacity-90",
  outline: "border border-line bg-card text-ink hover:border-ink/40",
  ghost: "text-ink hover:bg-ink/5",
  success: "bg-ok text-navy-deep hover:brightness-95",
  danger: "border border-line bg-card text-danger hover:border-danger/50 hover:bg-danger-wash",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-[15px]",
  lg: "h-13 px-6 text-base",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

/** Button look for non-button elements such as <Link>. */
export function buttonStyles({
  variant = "primary",
  size = "md",
  block,
  className,
}: { variant?: Variant; size?: Size; block?: boolean; className?: string } = {}) {
  return cn(
    "inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    block && "w-full",
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", block, className, ...props }, ref) => (
    <button ref={ref} className={buttonStyles({ variant, size, block, className })} {...props} />
  ),
);
Button.displayName = "Button";
