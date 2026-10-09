import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { eventStream, type StreamEvent } from "../lib/stream";
import { useAuth } from "./AuthContext";

interface StreamState {
  /** Returns an unsubscribe function. */
  subscribe: (listener: (event: StreamEvent) => void) => () => void;
}

const StreamContext = createContext<StreamState | null>(null);

export function StreamProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      eventStream.stop();
      return;
    }
    eventStream.start();
    return () => eventStream.stop();
  }, [isAuthenticated]);

  return (
    <StreamContext.Provider value={{ subscribe: (l) => eventStream.subscribe(l) }}>
      {children}
    </StreamContext.Provider>
  );
}

/** Runs `onEvent` whenever the server pushes something. No polling anywhere. */
export function useStreamEvent(onEvent: (event: StreamEvent) => void) {
  const ctx = useContext(StreamContext);
  // Held in a ref so a new inline callback each render does not resubscribe.
  const handler = useRef(onEvent);
  handler.current = onEvent;

  useEffect(() => {
    if (!ctx) return;
    return ctx.subscribe((event) => handler.current(event));
  }, [ctx]);
}
