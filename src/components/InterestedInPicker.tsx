import type { Gender } from "../lib/types";

const OPTIONS: { value: Gender; label: string }[] = [
  { value: "FEMALE", label: "Women" },
  { value: "MALE", label: "Men" },
  { value: "NON_BINARY", label: "Non-binary people" },
  { value: "OTHER", label: "Other" },
];

interface Props {
  /** Who they want to see. Empty means everyone. */
  value: Gender[];
  onChange: (value: Gender[]) => void;
  /** The page's own pill styling, so this sits naturally beside its other choices. */
  pillClass: (active: boolean) => string;
}

/**
 * "Show me": which genders appear in Discover. Several can be chosen; choosing none, or all of them, is the same as
 * everyone, so "Everyone" is simply the state where nothing narrower is picked.
 */
export default function InterestedInPicker({ value, onChange, pillClass }: Props) {
  const everyone = value.length === 0 || value.length === OPTIONS.length;

  function toggle(g: Gender) {
    if (everyone) {
      onChange([g]);
      return;
    }
    const next = value.includes(g) ? value.filter((v) => v !== g) : [...value, g];
    onChange(next);
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Show me">
      <button type="button" onClick={() => onChange([])} aria-pressed={everyone} className={pillClass(everyone)}>
        Everyone
      </button>
      {OPTIONS.map((o) => (
        <button
          type="button"
          key={o.value}
          onClick={() => toggle(o.value)}
          aria-pressed={!everyone && value.includes(o.value)}
          className={pillClass(!everyone && value.includes(o.value))}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
