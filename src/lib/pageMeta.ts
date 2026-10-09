/**
 * Title and description for the pages that are not documents. One copy, used both by the page when
 * it runs in the browser and by the build step that pre-renders it, so the two can never drift.
 * (The text pages - Terms, Privacy, FAQ, guides - carry their own in lib/legal.ts and
 * lib/siteContent.ts.)
 */
export const pageMeta = {
  landing: {
    title: "Privlee - Private, discreet connection for adults",
    description:
      "A private, pseudonym-only space for adults seeking discreet connection. No real names, photos blurred by default, and a one-tap panic button.",
  },
  login: {
    title: "Sign in - Privlee",
    description: "Sign in to Privlee, the private, pseudonym-only space for discreet connection.",
  },
  signup: {
    title: "Create your private profile - Privlee",
    description:
      "Join Privlee in a minute: choose a pseudonym, tell us what you're looking for, and meet people discreetly. Adults 18+ only.",
  },
} as const;
