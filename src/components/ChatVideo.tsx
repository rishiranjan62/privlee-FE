import { useEffect, useState } from "react";

/** Whether the window is the one being looked at; a video is hidden whenever it is not (see ChatPicture). */
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

/**
 * A video in a conversation. Like pictures: no download button, no right-click menu, no picture-in-picture, blurred
 * and paused when the window loses focus, and never printed. A browser cannot stop the operating system recording
 * the screen - the Android app can, and does - so this is care, not a promise.
 */
export default function ChatVideo({ src }: { src: string }) {
  const focused = useWindowFocused();
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="chat-picture rounded-2xl border border-line bg-card px-5 py-4 text-sm text-muted">
        This video isn't available any more.
      </div>
    );
  }

  return (
    <video
      src={src}
      controls
      playsInline
      preload="metadata"
      controlsList="nodownload noremoteplayback noplaybackrate"
      disablePictureInPicture
      disableRemotePlayback
      onContextMenu={(e) => e.preventDefault()}
      onError={() => setFailed(true)}
      ref={(el) => {
        if (el && !focused && !el.paused) el.pause();
      }}
      className={`chat-picture no-save block max-h-80 w-auto max-w-full rounded-2xl border border-line bg-black object-contain transition ${
        focused ? "" : "blur-2xl"
      }`}
    />
  );
}
