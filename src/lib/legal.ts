/**
 * The text of the Terms of Service and Privacy Policy.
 *
 * TODO before launch: have a lawyer review both, and add (a) the governing law and venue for
 * disputes, (b) a real contact address for privacy requests, and (c) the name of the company that
 * operates the service. Until the product has an account-deletion flow and a retention policy for
 * removed photos, keep the "Your choices" and "How long we keep it" sections matching what is
 * actually built.
 *
 * Content is data (not JSX) so the two documents share one layout and a change is a text edit.
 */
export interface LegalSection {
  heading: string;
  /** A string is a paragraph; a string[] is a bulleted list. */
  body: (string | string[])[];
}

export interface LegalDocument {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

export const terms: LegalDocument = {
  title: "Terms of Service",
  updated: "10 October 2026",
  intro:
    "These terms are the agreement between you and Privlee. They explain what you can expect from us and what we expect from you. Please read them before you create an account.",
  sections: [
    {
      heading: "Who can use Privlee",
      body: [
        "Privlee is for adults only. You must be at least 18 years old to create an account, and by signing up you confirm that you are. If we have reason to believe someone is under 18, we will remove their account.",
        [
          "You must give accurate information, including your date of birth.",
          "You may hold one account. Do not create an account for someone else.",
          "You must be allowed to use the service where you live.",
          "We may ask you to confirm your email address before you can use your account.",
        ],
      ],
    },
    {
      heading: "Your account and pseudonym",
      body: [
        "Privlee is built so that you appear under a pseudonym. Other members see your pseudonym, age, city and the profile details and photos you choose to share - never your email address or real name.",
        "You are responsible for keeping your password safe and for what happens under your account. Tell us straight away if you think someone else has access to it.",
      ],
    },
    {
      heading: "What you share",
      body: [
        "You own what you post. By posting it, you give us permission to store it, process it (for example, to make a blurred copy of a photo) and show it to other members according to your settings, so that we can run the service.",
        [
          "Photos are blurred for other members by default. You decide who can see them clearly, and you can take that access back at any time.",
          "Only upload photos that show you, or that you have the right to share.",
          "Do not post anything that another person has not agreed to share.",
        ],
      ],
    },
    {
      heading: "How to behave",
      body: [
        "Treat everyone with respect. You must not:",
        [
          "harass, threaten, pressure or abuse anyone;",
          "ask for money, gifts or favours, or try to blackmail or extort anyone;",
          "pretend to be someone else, or run a fake or misleading profile;",
          "share sexual content involving anyone under 18, or any content that is illegal;",
          "share another person's private photos, messages or details without their permission;",
          "use Privlee to advertise, sell, or recruit;",
          "scrape, copy or collect other members' information, or interfere with how the service works.",
        ],
        "Virtual gifts, winks and emoji are a way to be kind. They have no cash value and cannot be exchanged for money.",
      ],
    },
    {
      heading: "Keeping people safe",
      body: [
        "You can block or report anyone at any time. A block hides you from each other, and the other person is not told.",
        "When you report someone, our team reviews the report. If the report is about a conversation, we keep a snapshot of that conversation so we can review what happened fairly, even if either of you later blocks or unmatches. Our team only looks at it to decide the report.",
        "We may warn, suspend or permanently remove members who break these terms, and we may remove content that does. We aim to be fair and to explain what we have done where it is safe to do so. We do not tell a person who reported them.",
      ],
    },
    {
      heading: "Ending your account",
      body: [
        "You can delete your account yourself at any time from the profile menu. Deleting is permanent: your profile, photos, matches, conversations and likes are removed. We keep your email address and any safety reports involving you (see the Privacy Policy). If you come back later with the same email, we will recognise you and welcome you back - you will start again with a fresh profile.",
        "We can suspend or close an account that breaks these terms, puts others at risk, or is used for something unlawful. Where an account is closed for breaking the rules, you will not be allowed to create a new one, and deleting your account does not change that.",
      ],
    },
    {
      heading: "Meeting people",
      body: [
        "Privlee helps you get in touch with other people. We do not check who anyone really is, and we cannot promise that a member is who they say they are. Be careful with what you share, tell a friend before you meet someone, and meet in a public place first.",
      ],
    },
    {
      heading: "The service as it is",
      body: [
        "We work hard to keep Privlee running and safe, but we provide it as it is. We do not promise it will always be available, error-free or that you will find a match. To the fullest extent the law allows, we are not responsible for what members say or do, or for losses that were not a foreseeable result of our own failure to take reasonable care. Nothing in these terms limits any right you have by law that cannot be limited.",
      ],
    },
    {
      heading: "Changes to these terms",
      body: [
        "We may update these terms as the service changes. When we make an important change we will tell you in the app before it applies. If you keep using Privlee after a change, that means you accept the new terms.",
      ],
    },
    {
      heading: "Questions and concerns",
      body: [
        "If something is wrong, use the Report option on a member's profile, or on a conversation, from inside the app. For anything else about these terms, you can contact us through the support details that will be published here.",
      ],
    },
  ],
};

export const privacy: LegalDocument = {
  title: "Privacy Policy",
  updated: "10 October 2026",
  intro:
    "Privlee exists because discretion matters. This policy explains, in plain words, what we collect, why, who can see it, and how long we keep it.",
  sections: [
    {
      heading: "What we collect",
      body: [
        [
          "Account details: your email address and a password (we store a scrambled form of it, never the password itself), or your Google account email if you sign in with Google. We receive only your email from Google - not your name or picture.",
          "Profile details: your pseudonym, date of birth, gender, city, and the answers and preferences you add.",
          "Photos: the pictures you upload, and a blurred copy we make of each one.",
          "Activity: your likes, matches, messages, gifts, blocks and reports, and the times you were last active.",
          "Your agreement: the time you agreed to our terms and which version you saw. This includes your confirmation that you are 18 or over.",
          "Use of the app: roughly how many days you were active and how long you spent using the app each day. This is linked to your account and used to understand how the product is used.",
        ],
      ],
    },
    {
      heading: "What we do not collect",
      body: [
        "We do not use advertising or tracking cookies. When someone visits our website, we count page views without recording who they are: no IP address, no device identifier and no cookie is stored for this. We do work out a rough location (the country, and sometimes the state and city) from the connection at that moment, and we keep only the name of that place as part of a count, never together with anything that could identify you. If you choose to sign in with Google, Google\u2019s own sign-in button may set its own cookies, under Google\u2019s privacy policy. The only cookie we set ourselves is a small one that remembers failed age checks for one day: the first mistake is forgiven, but after a second the same browser cannot keep trying different dates of birth. It holds nothing about you. We do not sell your information, and we do not share it with advertisers.",
      ],
    },
    {
      heading: "Who can see what",
      body: [
        [
          "Other members see your pseudonym, age, city and the profile details you chose to share. They never see your email address or real name.",
          "Your photos are blurred for everyone else until you allow a person to see them (or mark a photo as public). You can take that access back at any time, and the photo is blurred again for them immediately.",
          "When someone likes you, you are told that someone did - not who - until you match.",
          "Our moderation team can see account details, reports and, when a report is about a conversation, a snapshot of it. Looking at someone's photos or a reported conversation is recorded in a log that our team cannot edit or delete.",
        ],
      ],
    },
    {
      heading: "Why we use your information",
      body: [
        [
          "To run Privlee: to create your account, show your profile, make matches and deliver messages.",
          "To keep people safe: to review reports, stop abuse and enforce our terms.",
          "To protect the service: to prevent fraud, secure accounts and fix problems.",
          "To improve the product: using counts and averages, such as how many people joined or were active, and where in the world they are from at the level of a city.",
          "To email you about your account, such as confirming your email address. We keep these emails plain and discreet.",
        ],
      ],
    },
    {
      heading: "Your discretion tools",
      body: [
        "The panic control hides the whole app behind a neutral screen at any time. You can block anyone, unmatch, and decide exactly who sees your photos.",
      ],
    },
    {
      heading: "How long we keep it",
      body: [
        "We keep your account details and content while your account is open. Where a report involves a conversation, the saved snapshot is deleted automatically 90 days after the report is resolved. Some records, such as the log of what our team did, are kept for longer so we can show that people were treated fairly and meet legal duties.",
      ],
    },
    {
      heading: "Your choices",
      body: [
        [
          "You can change or remove most of what is on your profile at any time, and delete any photo.",
          "You can delete your account yourself at any time from the profile menu. We then remove your profile, photos, matches, conversations, likes, notifications and usage history straight away. See \u201cWhen you delete your account\u201d below for what we keep.",
          "You can ask to see the information we hold about you, or to correct it, through the support details that will be published here.",
          "You can sign out at any time, and change your password from the profile menu.",
        ],
      ],
    },
    {
      heading: "When you delete your account",
      body: [
        "Deleting your account removes your profile, answers, photos (including the blurred copies), matches, conversations, likes, notifications, the people you blocked, and your usage history. It cannot be undone.",
        "We do keep a small amount, and only for these reasons:",
        [
          "Your email address, and the date you first joined. This is so that if you return, we recognise you and welcome you back instead of treating you as a stranger, and so that anyone who was removed for breaking the rules cannot simply start again.",
          "Safety reports that involve you, and the saved snapshot of a reported conversation until 90 days after the report is resolved, because they may still need to be acted on.",
          "People who blocked you stay blocked, so they are not exposed to you again if you return.",
          "A record that the account was deleted, in the log of our team's actions.",
        ],
        "If you come back with the same email, you confirm it again and set up a fresh profile. None of your earlier profile, photos or conversations return.",
      ],
    },
    {
      heading: "Keeping your information safe",
      body: [
        "Passwords are stored in scrambled form. Photos are kept in private storage with our cloud storage provider, Cloudflare, and are only shown through short-lived links tied to the person looking, and the blurred copy of a photo is made on our servers, so an unblurred picture is never sent to someone who is not allowed to see it. No system is perfectly safe, but we take care to protect what you give us.",
      ],
    },
    {
      heading: "Adults only",
      body: [
        "Privlee is not for anyone under 18. We ask for your date of birth, and nobody under 18 can join. If you are turned away for being under 18, we do not keep the date you entered.",
        "If we learn that someone under 18 has an account, we erase their profile, photos, matches and messages straight away and close the account. We keep only the email address, so that the same account cannot simply be created again.",
      ],
    },
    {
      heading: "Changes to this policy",
      body: [
        "If we change how we use your information, we will update this page and tell you in the app before an important change applies.",
      ],
    },
  ],
};
