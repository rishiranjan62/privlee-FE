// The .ts extension lets vite.config.ts import this file under Node's stricter module rules.
import type { LegalDocument } from "./legal.ts";

/**
 * Public, indexable content: the FAQ and a handful of guides. It is written from what the product
 * actually does - if a feature changes, change the words here too, because search results quote them.
 *
 * Two things are deliberately NOT said anywhere in here:
 *  - how to get back out of the panic screen. That gesture is taught once, inside the app, so a
 *    bystander cannot read it; publishing it on a search-indexed page would defeat the feature.
 *  - claims we cannot back up (member counts, "verified" promises, guarantees of safety).
 */
export interface SiteDocument extends LegalDocument {
  /** Used in the address (/guides/<slug>) and the sitemap. */
  slug: string;
  /** The meta description - what a search result shows under the title. */
  description: string;
}

export const faq: SiteDocument = {
  slug: "faq",
  title: "Frequently asked questions",
  description:
    "Answers about Privlee: who can join, how pseudonyms and photo privacy work, how likes and matches work, and how to delete your account.",
  updated: "10 October 2026",
  intro: "Short, honest answers about how Privlee works and how it protects your privacy.",
  sections: [
    {
      heading: "What is Privlee?",
      body: [
        "Privlee is a private, pseudonym-only space for adults who want discreet connection. You appear under a name you choose, your photos are blurred until you decide otherwise, and you stay in control of who sees what.",
      ],
    },
    {
      heading: "Who can join?",
      body: [
        "Only adults. You must be at least 18: we ask for your date of birth, you confirm you are an adult when you sign up, and you confirm your email address before you can use your account. If we find an account belonging to someone under 18, we erase it.",
      ],
    },
    {
      heading: "Do I have to use my real name?",
      body: [
        "No. You choose a pseudonym when you sign up and that is all other members ever see, together with your age, city and whatever you choose to add to your profile. Your email address and real name are never shown to anyone.",
      ],
    },
    {
      heading: "Who can see my photos?",
      body: [
        "By default, nobody sees them clearly. Other members see a blurred version, and the blur is applied on our servers, so a clear picture is never sent to someone who is not allowed to see it.",
        "You can allow specific people to see your photos, and take that access back at any time, after which the photos are blurred for them again immediately. You can also mark individual photos as public.",
      ],
    },
    {
      heading: "How do likes and matches work?",
      body: [
        "You like a profile first. If you are liked, you are told that someone liked you, but not who. When two people like each other it is a match, both of you are notified, and you can start messaging.",
      ],
    },
    {
      heading: "What can I send once we match?",
      body: [
        "Text messages, winks, emoji and virtual gifts such as a rose. Gifts are a friendly gesture; they have no cash value.",
      ],
    },
    {
      heading: "What is the panic button?",
      body: [
        "One tap hides the whole app behind a neutral screen, for the moment someone looks over your shoulder. There is a private way back that you are shown inside the app, which is deliberately not written down in public.",
      ],
    },
    {
      heading: "Can I browse without being seen?",
      body: [
        "Yes. Incognito browsing takes your profile out of Discover while you look around. You can turn it on and off from your profile.",
      ],
    },
    {
      heading: "How do I block or report someone?",
      body: [
        "From their profile or your conversation, you can block, unmatch or report them. A block hides you from each other and the other person is not told. Reports are reviewed by our team, and the person you report is not told who reported them.",
      ],
    },
    {
      heading: "Will emails from Privlee give me away?",
      body: [
        "We keep our emails plain and neutral, so that a notification in your inbox does not announce what the service is.",
      ],
    },
    {
      heading: "How do I delete my account?",
      body: [
        "Open the profile menu and choose Delete account. Your profile, photos, matches, conversations and likes are removed straight away. We keep your email address and any safety reports involving you; the Privacy Policy explains why.",
      ],
    },
  ],
};

export const guides: SiteDocument[] = [
  {
    slug: "how-photo-privacy-works",
    title: "How photo privacy works on Privlee",
    description:
      "Your photos are blurred for everyone by default. Learn how you choose who sees them, how to take access back, and why a clear picture never reaches the wrong person.",
    updated: "10 October 2026",
    intro:
      "Photos are the most personal thing on a profile, so on Privlee they start private and stay under your control.",
    sections: [
      {
        heading: "Blurred by default",
        body: [
          "When you upload a photo, we make a heavily blurred copy of it. Everyone else sees that copy unless you have allowed them to see more. The blur is made on our servers by shrinking the picture so far that facial detail is destroyed, so it cannot be undone by anyone looking at the image.",
        ],
      },
      {
        heading: "You decide who sees them clearly",
        body: [
          "If someone wants to see your photos, they ask. You can allow or decline. Allowing one person does not show your photos to anyone else.",
        ],
      },
      {
        heading: "Taking access back",
        body: [
          "You can remove someone's access whenever you like. Their view goes back to the blurred copy straight away, without a notification to them.",
        ],
      },
      {
        heading: "Public photos",
        body: [
          "If there is a picture you are happy for anyone to see, you can mark that one photo as public while the rest stay private. Reorder or delete photos at any time.",
        ],
      },
      {
        heading: "A safeguard if something goes wrong",
        body: [
          "If a blurred copy is ever missing, we show nothing rather than the original. A clear photo is never used as a fallback.",
        ],
      },
    ],
  },
  {
    slug: "how-the-panic-button-works",
    title: "How the panic button keeps you discreet",
    description:
      "One tap hides Privlee behind an ordinary-looking screen. Here is what the panic button does, and the other tools that help you stay private.",
    updated: "10 October 2026",
    intro:
      "Sometimes you need the screen to look like something else, immediately. That is what the panic button is for.",
    sections: [
      {
        heading: "One tap",
        body: [
          "The panic button sits on every screen inside the app. One tap replaces the whole app with a plain, harmless-looking screen, so nobody beside you sees a dating app.",
        ],
      },
      {
        heading: "Getting back in",
        body: [
          "There is a private way back to the app. You are shown it inside the app, once, and we deliberately do not publish it: anything easy for a stranger to find would defeat the purpose.",
        ],
      },
      {
        heading: "Other ways to stay private",
        body: [
          [
            "Use a pseudonym, never your real name.",
            "Keep your photos blurred, and share them only with people you trust.",
            "Turn on incognito browsing to leave Discover while you look around.",
            "Sign out on shared devices.",
          ],
        ],
      },
      {
        heading: "Discreet emails",
        body: [
          "The emails we send are written to be plain and neutral, so a message in your inbox does not announce what the service is.",
        ],
      },
    ],
  },
  {
    slug: "staying-safe-when-you-meet-someone",
    title: "Staying safe when you meet someone new",
    description:
      "Practical advice for meeting someone you met online: take your time, meet in public, tell a friend, and use block and report whenever you need to.",
    updated: "10 October 2026",
    intro:
      "Meeting someone from an app can go well, and a few habits make it much safer. None of this is a guarantee, but all of it helps.",
    sections: [
      {
        heading: "Take your time",
        body: [
          "Talk for a while before you meet. Notice whether their story stays consistent, and be wary of anyone who rushes you, avoids simple questions or pushes to move the conversation somewhere else quickly.",
        ],
      },
      {
        heading: "Protect what you share",
        body: [
          "Keep your pseudonym and your blurred photos until you trust someone. Do not share your home address, workplace or financial details, and never send money to someone you have not met, whatever the reason given.",
        ],
      },
      {
        heading: "Meet somewhere public",
        body: [
          [
            "Choose a public place for the first meeting.",
            "Tell a friend where you are going and who with.",
            "Arrange your own way there and back.",
            "Keep your phone charged and your drinks in sight.",
          ],
        ],
      },
      {
        heading: "Trust your instincts",
        body: [
          "If something feels wrong, leave. You do not owe anyone an explanation.",
        ],
      },
      {
        heading: "Block and report",
        body: [
          "You can block or report anyone from their profile or your conversation. A block hides you from each other without telling them, and reports are reviewed by our team. Pressure for money, threats and blackmail are against our rules and will lead to removal.",
        ],
      },
    ],
  },
  {
    slug: "what-pseudonym-only-means",
    title: "What “pseudonym only” means",
    description:
      "On Privlee you appear under a name you choose. See what other members can and cannot see about you, and what stays private.",
    updated: "10 October 2026",
    intro:
      "A pseudonym is a name you choose for yourself. On Privlee it is the only name anyone ever sees.",
    sections: [
      {
        heading: "What others can see",
        body: [
          [
            "Your pseudonym.",
            "Your age and your city.",
            "The profile details you choose to add: what you are looking for, your interests and your answers.",
            "Your photos, blurred unless you have allowed someone to see more.",
          ],
        ],
      },
      {
        heading: "What stays private",
        body: [
          "Your email address and your real name are never shown to other members. If you sign in with Google, we receive only your email address, not your name or your picture.",
        ],
      },
      {
        heading: "Likes without names",
        body: [
          "When someone likes you, you are told that someone did, without who. Names appear to each other only once you both like each other.",
        ],
      },
      {
        heading: "Changing your mind",
        body: [
          "You can edit your profile whenever you like, and you can delete your account completely from the profile menu.",
        ],
      },
    ],
  },
];

export function findGuide(slug: string | undefined): SiteDocument | undefined {
  return guides.find((g) => g.slug === slug);
}
