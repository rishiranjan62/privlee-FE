import { tokenStore } from "./api";
import type { NotificationType } from "./types";

export interface StreamEvent {
  type: NotificationType;
  message: string;
  link: string | null;
}

type Listener = (event: StreamEvent) => void;

const RECONNECT_MS = 3000;

/**
 * Server-sent events, consumed with fetch rather than EventSource.
 *
 * <p>EventSource cannot set request headers, which would force the JWT into the query string where
 * it ends up in server logs and browser history. Reading the stream manually keeps it in the
 * Authorization header.
 *
 * <p>Exactly one connection is held at a time. That is not a nicety: a browser allows only a
 * handful of concurrent connections per origin, and a long-lived stream occupies one of them
 * permanently. Leak two or three and every other request to the API simply queues forever.
 * `generation` is bumped on every stop/start so an aborted attempt can never resurrect itself
 * through the reconnect path after a newer one has begun.
 */
class EventStream {
  private listeners = new Set<Listener>();
  private controller: AbortController | null = null;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private generation = 0;
  private live = false;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  start() {
    if (this.live) return;
    this.live = true;
    this.connect(++this.generation);
  }

  stop() {
    this.live = false;
    // Invalidates any in-flight attempt and any reconnect it might schedule.
    this.generation++;
    this.clearRetry();
    this.controller?.abort();
    this.controller = null;
  }

  private clearRetry() {
    if (this.retry) {
      clearTimeout(this.retry);
      this.retry = null;
    }
  }

  private scheduleReconnect(generation: number) {
    if (!this.live || generation !== this.generation) return;
    this.clearRetry();
    this.retry = setTimeout(() => this.connect(generation), RECONNECT_MS);
  }

  private async connect(generation: number) {
    if (generation !== this.generation) return;

    const token = tokenStore.get();
    if (!token) {
      this.live = false;
      return;
    }

    const controller = new AbortController();
    this.controller = controller;

    try {
      const response = await fetch("/api/notifications/stream", {
        headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
        signal: controller.signal,
      });

      if (generation !== this.generation) {
        controller.abort();
        return;
      }
      if (!response.ok || !response.body) {
        this.scheduleReconnect(generation);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done || generation !== this.generation) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by a blank line.
        let split;
        while ((split = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, split);
          buffer = buffer.slice(split + 2);
          this.dispatch(frame);
        }
      }
    } catch {
      // Aborted deliberately, or the network dropped.
    } finally {
      if (this.controller === controller) this.controller = null;
    }

    this.scheduleReconnect(generation);
  }

  private dispatch(frame: string) {
    const dataLine = frame.split("\n").find((l) => l.startsWith("data:"));
    if (!dataLine) return;
    const payload = dataLine.slice(5).trim();
    if (!payload || payload === "{}") return;
    try {
      const event = JSON.parse(payload) as StreamEvent;
      this.listeners.forEach((l) => l(event));
    } catch {
      /* ignore malformed frames */
    }
  }
}

export const eventStream = new EventStream();
