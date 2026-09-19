import { usePanic } from "../context/PanicContext";

export default function PanicButton() {
  const { trigger } = usePanic();

  return (
    <button
      onClick={trigger}
      title="Leave instantly"
      aria-label="Leave instantly"
      className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface-raised text-text-muted shadow-lg transition hover:border-danger hover:text-danger"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={2}>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
