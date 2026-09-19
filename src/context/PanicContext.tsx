import { createContext, useContext, useState, type ReactNode } from "react";
import { api } from "../lib/api";

interface PanicState {
  disguised: boolean;
  trigger: () => void;
  reveal: () => void;
}

const PanicContext = createContext<PanicState | null>(null);

const DISGUISE_KEY = "dd_disguised";

export function PanicProvider({ children }: { children: ReactNode }) {
  const [disguised, setDisguised] = useState(sessionStorage.getItem(DISGUISE_KEY) === "1");

  const trigger = () => {
    sessionStorage.setItem(DISGUISE_KEY, "1");
    setDisguised(true);
    api.panic().catch(() => {
      /* the disguise must never fail to appear because of a network hiccup */
    });
  };

  const reveal = () => {
    sessionStorage.removeItem(DISGUISE_KEY);
    setDisguised(false);
  };

  return (
    <PanicContext.Provider value={{ disguised, trigger, reveal }}>
      {children}
    </PanicContext.Provider>
  );
}

export function usePanic(): PanicState {
  const ctx = useContext(PanicContext);
  if (!ctx) throw new Error("usePanic must be used within PanicProvider");
  return ctx;
}
