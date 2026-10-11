import { useEffect, useState } from "react";
import Portal from "./Portal";

/**
 * Whether the window is the one being looked at. A picture is blurred whenever it is not: switching to another
 * window or tab hides it, so it is not left readable in a screen share or a task-switcher preview.
 */
function useWindowFocused(): boolean {
  const [focused, setFocused] = useState(() => document.visibilityState === "visible" && document.hasFocus());
  useEffect(() => {
    const update = () => setFocused(document.visibilityState === "visible" && document.hasFocus());
    window.addEventListener("focus", update);
    window.addEventListener("blur", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.removeEventListener("focus", update);
      window.removeEventListener("blur", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return focused;
}

/** What stops a picture being picked up with the mouse: no dragging, no right-click menu, no text-selection handles. */
const guard = {
  draggable: false,
  onContextMenu: (e: React.SyntheticEvent) => e.preventDefault(),
  onDragStart: (e: React.SyntheticEvent) => e.preventDefault(),
} as const;

/**
 * A picture in a conversation. There is deliberately no save, download or share button, the picture can't be dragged
 * out or right-clicked, it is blurred when the window loses focus and it never prints. A browser cannot stop the
 * operating system taking a screenshot - the Android app can, and does - so none of this is a promise, only care.
 */
export default function ChatPicture({ src }: { src: string }) {
  const focused = useWindowFocused();
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (failed) {
    return (
      <div className="chat-picture rounded-2xl border border-line bg-card px-5 py-4 text-sm text-muted">
        This picture isn't available any more.
      </div>
    );
  }

  const shield = focused ? "" : "blur-2xl";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open picture"
        className="chat-picture block overflow-hidden rounded-2xl border border-line bg-card"
      >
        <img
          src={src}
          alt="A picture in this conversation"
          loading="lazy"
          onError={() => setFailed(true)}
          className={`no-save block max-h-80 w-auto max-w-full object-contain transition ${shield}`}
          {...guard}
        />
      </button>

      {open && (
        <Portal>
          <div
            className="chat-picture fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4"
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Picture"
          >
            <img
              src={src}
              alt="A picture in this conversation"
              onError={() => {
                setOpen(false);
                setFailed(true);
              }}
              className={`no-save max-h-full max-w-full object-contain transition ${shield}`}
              {...guard}
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-full bg-white/15 px-3 py-1.5 text-sm text-white backdrop-blur"
            >
              Close
            </button>
          </div>
        </Portal>
      )}
    </>
  );
}
