import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { AdLocationOption, AdReach } from "../lib/types";

const labelClass = "text-xs font-semibold uppercase tracking-wider text-muted";

/** The one-click choices shown before anything is typed: the states and cities ads are most often aimed at. */
const QUICK = [
  "state:karnataka",
  "city:bengaluru",
  "state:maharashtra",
  "city:mumbai",
  "city:pune",
  "state:delhi",
  "state:tamil nadu",
  "city:chennai",
  "state:telangana",
  "city:hyderabad",
  "state:goa",
  "state:west bengal",
  "state:gujarat",
  "state:kerala",
];

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

/** Aim an ad at places: click a state or a city, search for one, or type a city that is not listed. Nothing chosen means everyone. */
export default function LocationTargeting({ value, onChange }: { value: string[]; onChange: (keys: string[]) => void }) {
  const [options, setOptions] = useState<AdLocationOption[]>([]);
  const [query, setQuery] = useState("");
  const [reach, setReach] = useState<AdReach | null>(null);

  useEffect(() => {
    api.getAdLocations().then(setOptions).catch(() => {});
  }, []);

  const byKey = useMemo(() => new Map(options.map((o) => [o.key, o])), [options]);
  const stateName = (key: string) => byKey.get(`state:${key}`)?.label ?? titleCase(key);
  const describe = (o: AdLocationOption) => (o.kind === "state" ? "state" : o.state ? `city in ${stateName(o.state)}` : "city");
  const labelOf = (key: string) => byKey.get(key)?.label ?? titleCase(key.slice(key.indexOf(":") + 1));
  const kindOf = (key: string) => (key.startsWith("state:") ? "state" : "city");

  // How many current members this aim reaches, so the size of the audience is known before saving.
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      api
        .getAdReach(value)
        .then((r) => {
          if (!cancelled) setReach(r);
        })
        .catch(() => {});
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [value]);

  const toggle = (key: string) => onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);

  const q = query.trim().toLowerCase();
  const matches = q
    ? options
        .filter((o) => o.label.toLowerCase().includes(q) || o.aliases.some((a) => a.includes(q)) || (o.state ?? "").includes(q))
        .slice(0, 8)
    : [];
  const typedIsListed = options.some((o) => o.label.toLowerCase() === q || o.aliases.includes(q));

  function addTyped() {
    const text = query.trim();
    if (!text) return;
    const exact = options.find((o) => o.label.toLowerCase() === text.toLowerCase() || o.aliases.includes(text.toLowerCase()));
    // A state or listed city by name; anything else is taken as a city typed by hand.
    const key = exact ? exact.key : `city:${text.toLowerCase().replace(/\s+/g, " ")}`;
    if (!value.includes(key)) onChange([...value, key]);
    setQuery("");
  }

  return (
    <fieldset>
      <legend className={labelClass}>Who sees it, by location</legend>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {value.length === 0 ? (
          <span className="rounded-full border border-line bg-[#f4f2ee] px-3 py-1 text-sm text-muted">Everyone, anywhere</span>
        ) : (
          value.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              title="Click to remove"
              className="group flex items-center gap-1.5 rounded-full border border-gold bg-gold/10 px-3 py-1 text-sm transition hover:bg-gold/20"
            >
              {labelOf(key)}
              <span className="text-[10px] uppercase tracking-wider text-muted">{kindOf(key)}</span>
              <span aria-hidden className="text-muted transition group-hover:text-ink">×</span>
            </button>
          ))
        )}
        {value.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="ml-1 text-xs text-muted underline-offset-2 hover:underline">
            Everyone instead
          </button>
        )}
      </div>

      <p className="mt-2 text-xs text-muted">One click adds a place. A state reaches its main cities, and every spelling counts (Bengaluru, Bangalore and Bengaluru Urban are one place).</p>

      <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Quick picks">
        {QUICK.filter((k) => byKey.has(k)).map((key) => {
          const on = value.includes(key);
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(key)}
              className={`rounded-full border px-3 py-1 text-xs transition ${on ? "border-ink bg-ink text-canvas" : "border-line bg-white hover:border-gold"}`}
            >
              {labelOf(key)}
              <span className={`ml-1 ${on ? "opacity-70" : "text-muted"}`}>{kindOf(key)}</span>
            </button>
          );
        })}
      </div>

      <div className="relative mt-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTyped();
            }
          }}
          placeholder="Search a state or city, e.g. Karnataka, Mysuru, Coimbatore"
          aria-label="Search a state or city"
          className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-gold"
        />
        {q && (
          <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-line bg-white py-1 shadow-lg">
            {matches.map((o) => (
              <li key={o.key}>
                <button
                  type="button"
                  onClick={() => {
                    toggle(o.key);
                    setQuery("");
                  }}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-[#f4f2ee]"
                >
                  <span>
                    {o.label}
                    {value.includes(o.key) && <span className="ml-2 text-xs text-gold">added</span>}
                  </span>
                  <span className="text-xs text-muted">{describe(o)}</span>
                </button>
              </li>
            ))}
            {!typedIsListed && (
              <li>
                <button type="button" onClick={addTyped} className="w-full px-3 py-1.5 text-left text-sm hover:bg-[#f4f2ee]">
                  Add "{query.trim()}" as a city
                </button>
              </li>
            )}
          </ul>
        )}
      </div>

      <p className="mt-2 text-sm" aria-live="polite">
        {reach === null ? (
          <span className="text-muted">Counting who this reaches...</span>
        ) : value.length === 0 ? (
          <>Reaches all <strong>{reach.total.toLocaleString()}</strong> members.</>
        ) : (
          <>
            Reaches <strong>{reach.members.toLocaleString()}</strong> of {reach.total.toLocaleString()} members right now.
            {reach.members === 0 && <span className="text-danger"> Nobody matches yet, so this ad would not be shown.</span>}
          </>
        )}
      </p>
    </fieldset>
  );
}
