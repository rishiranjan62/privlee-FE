/**
 * The Privlee wordmark: the first P carries a small keyhole, the "lee" is the gold italic.
 * Drawn as vector outlines (public/brand), so it never depends on a font loading.
 *
 * `variant="dark"` is for dark backgrounds (the "riv" turns cream). Size it with `className` (height);
 * the width follows.
 */
export default function Logo({ variant = "light", className = "h-9" }: { variant?: "light" | "dark"; className?: string }) {
  return (
    <img
      src={variant === "dark" ? "/brand/privlee-wordmark-on-dark.svg" : "/brand/privlee-wordmark.svg"}
      alt="Privlee"
      draggable={false}
      className={`${className} w-auto select-none`}
    />
  );
}
