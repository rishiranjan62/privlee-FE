/** Deterministic warm tint per pseudonym, so a photo-less profile still feels designed. */
const TINTS = [
  "from-[#e8c9a0] to-[#c98f6b]",
  "from-[#f0d4c0] to-[#d79a8a]",
  "from-[#cdb9a0] to-[#8e7a66]",
  "from-[#e6d2b0] to-[#bf9a66]",
];

export function tintFor(seed: string): string {
  let sum = 0;
  for (const ch of seed) sum += ch.charCodeAt(0);
  return TINTS[sum % TINTS.length];
}
