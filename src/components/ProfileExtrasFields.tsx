import { useState, type KeyboardEvent } from "react";
import { inputClass, labelClass, pillClass } from "../lib/ui";
import {
  availabilityOptions,
  discretionOptions,
  drinkingOptions,
  smokingOptions,
  INTEREST_SUGGESTIONS,
} from "../lib/labels";
import type { Availability, ProfileExtras } from "../lib/types";

const MAX_INTERESTS = 10;

interface Props {
  value: ProfileExtras;
  onChange: (patch: Partial<ProfileExtras>) => void;
}

export const emptyExtras: ProfileExtras = {
  interests: [],
  smoking: null,
  drinking: null,
  dislikes: null,
  wantsInConnection: null,
  discretionLevel: null,
  availability: [],
};

export default function ProfileExtrasFields({ value, onChange }: Props) {
  const [custom, setCustom] = useState("");

  function toggleInterest(tag: string) {
    const has = value.interests.includes(tag);
    if (!has && value.interests.length >= MAX_INTERESTS) return;
    onChange({
      interests: has ? value.interests.filter((i) => i !== tag) : [...value.interests, tag],
    });
  }

  function addCustom(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const tag = custom.trim().slice(0, 40);
    if (!tag || value.interests.includes(tag) || value.interests.length >= MAX_INTERESTS) {
      setCustom("");
      return;
    }
    onChange({ interests: [...value.interests, tag] });
    setCustom("");
  }

  function toggleAvailability(slot: Availability) {
    const has = value.availability.includes(slot);
    onChange({
      availability: has
        ? value.availability.filter((a) => a !== slot)
        : [...value.availability, slot],
    });
  }

  /** Clicking the selected option again clears it, since every field here is optional. */
  function toggleSingle<K extends "smoking" | "drinking" | "discretionLevel">(
    key: K,
    option: NonNullable<ProfileExtras[K]>,
  ) {
    onChange({ [key]: value[key] === option ? null : option } as Partial<ProfileExtras>);
  }

  return (
    <div className="space-y-6">
      <div>
        <label className={labelClass}>Interests</label>
        <div className="flex flex-wrap gap-2">
          {[...INTEREST_SUGGESTIONS, ...value.interests.filter((i) => !INTEREST_SUGGESTIONS.includes(i))].map(
            (tag) => (
              <button
                type="button"
                key={tag}
                onClick={() => toggleInterest(tag)}
                className={pillClass(value.interests.includes(tag))}
              >
                {tag}
              </button>
            ),
          )}
        </div>
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={addCustom}
          maxLength={40}
          placeholder="Add your own, then press Enter"
          className={`${inputClass} mt-3`}
        />
        <p className="mt-1.5 text-xs text-muted">
          {value.interests.length}/{MAX_INTERESTS} chosen
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Smoking</label>
          <div className="flex flex-wrap gap-2">
            {smokingOptions.map((o) => (
              <button
                type="button"
                key={o.value}
                onClick={() => toggleSingle("smoking", o.value)}
                className={pillClass(value.smoking === o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelClass}>Drinking</label>
          <div className="flex flex-wrap gap-2">
            {drinkingOptions.map((o) => (
              <button
                type="button"
                key={o.value}
                onClick={() => toggleSingle("drinking", o.value)}
                className={pillClass(value.drinking === o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className={labelClass}>How discreet do you need to be?</label>
        <div className="flex flex-wrap gap-2">
          {discretionOptions.map((o) => (
            <button
              type="button"
              key={o.value}
              onClick={() => toggleSingle("discretionLevel", o.value)}
              className={pillClass(value.discretionLevel === o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelClass}>When are you usually free?</label>
        <div className="flex flex-wrap gap-2">
          {availabilityOptions.map((o) => (
            <button
              type="button"
              key={o.value}
              onClick={() => toggleAvailability(o.value)}
              className={pillClass(value.availability.includes(o.value))}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelClass}>What you're hoping to find</label>
        <textarea
          value={value.wantsInConnection ?? ""}
          onChange={(e) => onChange({ wantsInConnection: e.target.value })}
          maxLength={500}
          rows={3}
          placeholder="The kind of person, and the kind of connection."
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Deal-breakers</label>
        <textarea
          value={value.dislikes ?? ""}
          onChange={(e) => onChange({ dislikes: e.target.value })}
          maxLength={500}
          rows={3}
          placeholder="What you'd rather avoid."
          className={inputClass}
        />
      </div>
    </div>
  );
}
