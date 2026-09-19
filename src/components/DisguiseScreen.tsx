import { useRef } from "react";
import { usePanic } from "../context/PanicContext";

const FAKE_NOTES = [
  { title: "Grocery list", body: "Milk, eggs, bread, coffee, dish soap" },
  { title: "Weekend plans", body: "Car service, gym, call the plumber" },
  { title: "Book recommendations", body: "Ask Sam about that thriller he mentioned" },
  { title: "Gift ideas", body: "Check sizes before ordering anything else" },
];

/**
 * The panic disguise. Five quick taps on the title reveal the real app again -
 * anything more discoverable (a visible button, a menu item) would defeat the point.
 */
export default function DisguiseScreen() {
  const { reveal } = usePanic();
  const taps = useRef(0);
  const lastTap = useRef(0);

  const handleTitleTap = () => {
    const now = Date.now();
    if (now - lastTap.current > 1500) {
      taps.current = 0;
    }
    lastTap.current = now;
    taps.current += 1;
    if (taps.current >= 5) {
      taps.current = 0;
      reveal();
    }
  };

  return (
    <div className="min-h-screen bg-yellow-50 text-gray-900">
      <header className="border-b border-yellow-200 px-4 py-3">
        <h1 className="text-lg font-semibold select-none" onClick={handleTitleTap}>
          Notes
        </h1>
      </header>
      <ul className="divide-y divide-yellow-200">
        {FAKE_NOTES.map((note) => (
          <li key={note.title} className="px-4 py-3">
            <p className="font-medium">{note.title}</p>
            <p className="text-sm text-gray-500">{note.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
