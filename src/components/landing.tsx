import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";

export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${shown ? "in" : ""} ${className}`}
      style={{ "--d": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

export function SpotCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  function onMove(e: MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  }
  return (
    <div onMouseMove={onMove} className={`spot ${className}`}>
      {children}
    </div>
  );
}

/**
 * The headline's changing last word. All the words sit in one grid cell, so the headline is always as wide as the
 * longest and never jumps when the word changes; only the current one is visible. The first word is simply there (no
 * fade-in), so the first thing painted is the real headline; later words ease in.
 */
export function RotatingWord({ words, interval = 2600 }: { words: string[]; interval?: number }) {
  const [i, setI] = useState(0);
  const [rotated, setRotated] = useState(false);
  useEffect(() => {
    const t = setInterval(() => {
      setRotated(true);
      setI((n) => (n + 1) % words.length);
    }, interval);
    return () => clearInterval(t);
  }, [words.length, interval]);
  return (
    <span className="inline-grid">
      {words.map((word, n) => (
        <span
          key={word}
          aria-hidden={n !== i}
          className={`col-start-1 row-start-1 gold-text italic ${n === i ? (rotated ? "swap-word" : "") : "invisible"}`}
        >
          {word}
        </span>
      ))}
    </span>
  );
}

export function useScrollProgress() {
  const [p, setP] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    function onScroll() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setP(max > 0 ? window.scrollY / max : 0);
      setScrolled(window.scrollY > 24);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return { progress: p, scrolled };
}
