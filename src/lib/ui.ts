/** Shared form and surface styles, so the app and the auth pages stay visually identical. */

export const inputClass =
  "w-full rounded-xl border border-line bg-white/70 px-4 py-3.5 text-ink placeholder:text-[#a79d8d] outline-none transition focus:border-gold focus:bg-white focus:ring-4 focus:ring-gold/15";

export const labelClass =
  "mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-muted";

export const primaryBtn =
  "group relative w-full overflow-hidden rounded-full bg-ink px-6 py-3.5 font-medium text-canvas shadow-[0_18px_40px_-14px_rgba(29,26,22,0.6)] transition hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0";

export const ghostBtn =
  "rounded-full border border-line bg-white/60 px-5 py-2.5 text-sm transition hover:border-gold";

export const cardClass =
  "rounded-3xl border border-line bg-card shadow-[0_30px_60px_-40px_rgba(120,80,30,0.4)]";

/** Pill used for single-choice option groups. */
export const pillClass = (active: boolean) =>
  `cursor-pointer rounded-full border px-4 py-2 text-sm transition ${
    active
      ? "border-ink bg-ink text-canvas"
      : "border-line bg-white/60 hover:border-gold"
  }`;

/** The profile-tile grid. Defined once so every browsing surface stays identical. */
export const tileGrid =
  "grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7";
