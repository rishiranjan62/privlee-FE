import { createPortal } from "react-dom";
import type { ReactNode } from "react";

/**
 * Draws its children directly in the page body, outside whatever contains the component that asked for them.
 *
 * A full-screen overlay (`position: fixed`) is measured against the nearest ancestor that has a blur, filter or
 * transform - and the page header has a blur. A dialog opened from the header's profile menu was therefore squeezed
 * into the header's strip instead of covering the screen. Anything meant to cover the page goes through here.
 */
export default function Portal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body);
}
