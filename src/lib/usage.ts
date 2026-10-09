import { api } from "./api";

/**
 * Measures real time in the app: seconds that pass while the tab is visible and the person has done
 * something (moved, clicked, typed, scrolled) in the last couple of minutes. A tab left open in the
 * background, or an unattended screen, adds nothing.
 *
 * Reported in small batches. The server clamps what it is told, so this is a measurement, not a
 * trust boundary.
 */
const TICK_MS = 5000;
const IDLE_AFTER_MS = 2 * 60 * 1000;
const FLUSH_EVERY_MS = 30 * 1000;

class UsageTracker {
  private timer: ReturnType<typeof setInterval> | null = null;
  private pendingSeconds = 0;
  private lastInteraction = 0;
  private lastFlush = 0;

  private onInteraction = () => {
    this.lastInteraction = Date.now();
  };

  private onVisibility = () => {
    if (document.visibilityState === "hidden") this.flush();
  };

  start() {
    if (this.timer) return;
    this.lastInteraction = Date.now();
    this.lastFlush = Date.now();
    for (const e of ["mousemove", "keydown", "click", "scroll", "touchstart"]) {
      window.addEventListener(e, this.onInteraction, { passive: true });
    }
    document.addEventListener("visibilitychange", this.onVisibility);
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  stop() {
    if (!this.timer) return;
    this.flush();
    clearInterval(this.timer);
    this.timer = null;
    for (const e of ["mousemove", "keydown", "click", "scroll", "touchstart"]) {
      window.removeEventListener(e, this.onInteraction);
    }
    document.removeEventListener("visibilitychange", this.onVisibility);
  }

  private tick() {
    const now = Date.now();
    if (document.visibilityState === "visible" && now - this.lastInteraction < IDLE_AFTER_MS) {
      this.pendingSeconds += TICK_MS / 1000;
    }
    if (now - this.lastFlush >= FLUSH_EVERY_MS) this.flush();
  }

  private flush() {
    this.lastFlush = Date.now();
    if (this.pendingSeconds <= 0) return;
    const seconds = Math.round(this.pendingSeconds);
    this.pendingSeconds = 0;
    api.reportUsage(seconds).catch(() => {});
  }
}

export const usageTracker = new UsageTracker();
