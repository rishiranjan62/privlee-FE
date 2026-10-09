import { useState } from "react";
import { inputClass } from "../lib/ui";

interface Props {
  value: string;
  onChange: (city: string) => void;
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, maximumAge: 300000 }),
  );
}

export default function CityInput({ value, onChange }: Props) {
  const [locating, setLocating] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setNote("Your browser can't share location. Type your city instead.");
      return;
    }
    setLocating(true);
    setNote(null);
    try {
      const pos = await getPosition();
      // Round to ~1 km so only a coarse area ever leaves the device.
      const lat = pos.coords.latitude.toFixed(2);
      const lon = pos.coords.longitude.toFixed(2);
      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
      );
      if (!res.ok) throw new Error("lookup failed");
      const data = (await res.json()) as { city?: string; locality?: string };
      const city = data.city || data.locality;
      if (!city) throw new Error("no city");
      onChange(city);
    } catch (err) {
      const denied = err instanceof GeolocationPositionError && err.code === err.PERMISSION_DENIED;
      setNote(
        denied
          ? "Location permission was denied. Type your city instead."
          : "Couldn't work out your city. Type it instead.",
      );
    } finally {
      setLocating(false);
    }
  }

  return (
    <div>
      <div className="relative">
        <input
          placeholder="Where you are"
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} pr-12`}
        />
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          title="Use my current location"
          aria-label="Use my current location"
          className="absolute inset-y-0 right-0 flex items-center px-3.5 text-[color:var(--l-gold)] transition hover:text-[color:var(--l-ink)] disabled:opacity-60"
        >
          {locating ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <circle cx="12" cy="12" r="3.5" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              <circle cx="12" cy="12" r="8" />
            </svg>
          )}
        </button>
      </div>
      {note && <p className="mt-2 text-xs text-[#a2453d]">{note}</p>}
    </div>
  );
}
