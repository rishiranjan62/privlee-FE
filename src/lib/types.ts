export type Gender = "MALE" | "FEMALE" | "NON_BINARY" | "OTHER";

export type LookingFor =
  | "AFFAIR"
  | "FRIENDSHIP"
  | "OPEN_RELATIONSHIP"
  | "CASUAL"
  | "EMOTIONAL_CONNECTION";

export type RelationshipStatus =
  | "MARRIED"
  | "ATTACHED"
  | "DIVORCED"
  | "SINGLE"
  | "OPEN_RELATIONSHIP";

export type Smoking = "NEVER" | "OCCASIONALLY" | "REGULARLY";
export type Drinking = "NEVER" | "SOCIALLY" | "REGULARLY";
export type DiscretionLevel = "MAXIMUM" | "HIGH" | "RELAXED";
export type Availability =
  | "WEEKDAY_DAYTIME"
  | "WEEKDAY_EVENINGS"
  | "WEEKENDS"
  | "LATE_NIGHT";

/** The optional, richer half of a profile. Empty until someone fills it in. */
export interface ProfileExtras {
  interests: string[];
  smoking: Smoking | null;
  drinking: Drinking | null;
  dislikes: string | null;
  wantsInConnection: string | null;
  discretionLevel: DiscretionLevel | null;
  availability: Availability[];
}

export type PhotoAccessStatus = "PENDING" | "APPROVED" | "DECLINED";

export interface PhotoAccessRequest {
  requestId: string;
  requesterId: string;
  requesterPseudonym: string;
  requesterCity: string | null;
  requestedAt: string;
}

export interface Photo {
  id: string;
  url: string;
  blurred: boolean;
  primary: boolean;
  /** In the private album. Only ever true on your own photos, or on someone's album you have been let into. */
  privatePhoto?: boolean;
}

/**
 * Someone else's private album as far as you may see it: how many photos, where you stand, and - once let in - the
 * photos. `access` is null until you ask; `unlockCost` is what it costs to be let in at once.
 */
export interface PrivateAlbum {
  count: number;
  access: PhotoAccessStatus | null;
  photos: Photo[];
  unlockCost: number;
}

export interface Profile extends ProfileExtras {
  userId: string;
  pseudonym: string;
  bio: string | null;
  age: number;
  gender: Gender;
  lookingFor: LookingFor;
  relationshipStatus: RelationshipStatus;
  city: string;
  discreetMode: boolean;
  verified: boolean;
  photos: Photo[];
  /** Null when looking at your own profile. */
  photoAccess: PhotoAccessStatus | null;
  /** Set when you and this person have matched. */
  matchId: string | null;
  /** Any conversation with this person, including one someone paid to start. */
  conversationId: string | null;
  /** Only present on your own profile: whether you already have a password of your own. */
  passwordSet: boolean | null;
  /** Only filled in on your own profile: whose profiles you want to see. Empty means everyone. */
  interestedIn?: Gender[];
  /** In Discover: you have already liked this person. */
  likedByMe?: boolean | null;
  /** Someone else's private album, if they have one. Null on your own profile. */
  privateAlbum?: PrivateAlbum | null;
  /** Only on your own profile: whether people you talk to can see when you were last active. */
  showLastActive?: boolean | null;
  /** When this person was last active, to the minute. Only for someone you are talking to, and only if they have not hidden it. */
  lastActiveAt?: string | null;
}

export type ProfileUpdate = Pick<
  Profile,
  "lookingFor" | "relationshipStatus" | "city" | "discreetMode"
> &
  Partial<ProfileExtras> & { bio: string; interestedIn?: Gender[]; showLastActive?: boolean };

export interface AuthResponse {
  accessToken: string;
  userId: string;
  pseudonym: string;
  /** True once someone who deleted their account has proved they own the email again. */
  welcomeBack?: boolean;
}

export interface SignupPayload extends Partial<ProfileExtras> {
  /** Whose profiles they want to see. Left out or empty means everyone. */
  interestedIn?: Gender[];
  email: string;
  password: string;
  pseudonym: string;
  dateOfBirth: string;
  gender: Gender;
  lookingFor: LookingFor;
  relationshipStatus: RelationshipStatus;
  city: string;
  /** They ticked "I am 18 or over and agree to the Terms and Privacy Policy". */
  acceptedTerms: boolean;
  /** Which version of the terms they were shown (its last-updated date). */
  termsVersion: string;
  /** Needed only while sign-up is closed. */
  inviteCode?: string;
}

/** Email signups return no token: the address has to be verified before anyone can sign in. */
export interface SignupResult {
  verificationRequired: boolean;
  auth: AuthResponse | null;
}

export interface MetricsPoint {
  day: string;
  value: number;
}

export interface MetricsSeries {
  key: string;
  label: string;
  points: MetricsPoint[];
}

export interface GenderShare {
  gender: Gender;
  members: number;
}

export interface AreaShare {
  label: string;
  members: number;
}

export interface Metrics {
  totals: Record<string, number>;
  series: MetricsSeries[];
  genders: GenderShare[];
  areas: AreaShare[];
}

export type Granularity = "day" | "week" | "month";

export interface AnalyticsPoint {
  /** First day of the bucket (UTC). */
  day: string;
  value: number;
}

export interface AnalyticsSeries {
  key: string;
  label: string;
  /** FLOW: how many happened in the bucket. STOCK: how many there are at its end. */
  kind: "FLOW" | "STOCK";
  /** "count" for most measures; "seconds" for time. */
  unit: "count" | "seconds" | "paise";
  /** Whole range: the sum for a flow, the final value for a stock, unique members for activity. */
  total: number;
  /** The same figure for the equally long range just before this one. */
  previousTotal: number;
  points: AnalyticsPoint[];
}

export interface TrafficSplit {
  label: string;
  views: number;
  visitors: number;
}

export interface Traffic {
  granularity: Granularity;
  from: string;
  to: string;
  lastBucketPartial: boolean;
  series: AnalyticsSeries[];
  byPlatform: TrafficSplit[];
  byPage: TrafficSplit[];
  byReferrer: TrafficSplit[];
  /** Countries by name; "Unknown" where the place could not be worked out. */
  byCountry: TrafficSplit[];
  /** "City, State, Country", only for visits where the city was available. */
  byCity: TrafficSplit[];
  funnel: { landingViews: number; signupViews: number; newMembers: number };
}

export interface GenderCount {
  gender: Gender;
  /** Everyone of this gender who had joined by the end of the range. */
  members: number;
  joined: number;
  active: number;
}

export interface AreaCount {
  /** Normalised city (lower-case, trimmed) - what the filter sends back. */
  key: string;
  label: string;
  members: number;
  joined: number;
  active: number;
}

export interface Analytics {
  granularity: Granularity;
  from: string;
  to: string;
  /** What the series are limited to, or null for everyone. */
  gender: Gender | null;
  /** The area the series are limited to (normalised city), or null. */
  city: string | null;
  /** Always everyone, whatever the filter. */
  genderBreakdown: GenderCount[];
  /** Every area, largest first, whatever the filter - also the options for the area filter. */
  areaBreakdown: AreaCount[];
  /** The last bucket has not finished yet, so it will read low. */
  lastBucketPartial: boolean;
  series: AnalyticsSeries[];
}

export interface GoogleLoginResult {
  profileRequired: boolean;
  auth: AuthResponse | null;
  /** The Google account belonged to a member who deleted their account. */
  welcomeBack?: boolean;
}

export interface GoogleSignupPayload extends Omit<SignupPayload, "email" | "password"> {
  idToken: string;
}

export type MessageType = "TEXT" | "WINK" | "GIFT" | "IMAGE" | "VIDEO";

export type GiftKey =
  | "ROSE"
  | "BOUQUET"
  | "CHOCOLATES"
  | "CHAMPAGNE"
  | "COFFEE"
  | "PERFUME"
  | "CAKE"
  | "TEDDY"
  | "HEART"
  | "KISS"
  | "HUG"
  | "FIRE"
  | "STAR"
  | "SUNFLOWER"
  | "BALLOON"
  | "WINE"
  | "ICE_CREAM"
  | "CHERRIES"
  | "CANDLE"
  | "MOONLIGHT"
  | "PARTY"
  | "DIAMOND"
  | "CROWN"
  | "RING"
  | "BLINDFOLD"
  | "HANDCUFFS"
  | "SILK_SCARF"
  | "FEATHER"
  | "MASK"
  | "ROOM_KEY"
  | "HOTEL"
  | "HEELS"
  | "LACE"
  | "OIL"
  | "DICE"
  | "PEACH"
  | "SPICE"
  | "STRAWBERRIES"
  | "WHISPER"
  | "SECRET_NOTE"
  | "MIDNIGHT"
  | "SATIN"
  | "VELVET_GLOVES"
  | "BUNNY_EARS"
  | "POTION"
  | "HOT_TUB"
  | "DINNER";

export interface GiftOption {
  key: GiftKey;
  label: string;
  emoji: string;
  cost: number;
  /** In the tray's "Playful" group. */
  playful?: boolean;
}

export type NotificationType =
  | "LIKE_RECEIVED"
  | "MATCH"
  | "MESSAGE"
  | "MESSAGE_DELETED"
  | "MESSAGE_EDITED"
  | "GIFT"
  | "PHOTO_ACCESS_REQUESTED"
  | "PHOTO_ACCESS_GRANTED"
  | "PHOTO_ACCESS_REVOKED"
  | "PRIVATE_ACCESS_REQUESTED"
  | "PRIVATE_ACCESS_GRANTED"
  | "PRIVATE_ACCESS_UNLOCKED"
  | "PRIVATE_ACCESS_REVOKED"
  | "MODERATION_WARNING"
  | "REPORT_RESOLVED"
  | "ADMIN_NEW_REPORT"
  | "ADMIN_PHOTOS_UPLOADED";

export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

/** Someone who liked you, with everything identifying removed on the server. */
export interface Admirer {
  photoUrl: string | null;
  age: number;
  lookingFor: LookingFor;
  likedAt: string | null;
}

export interface BlockedUser {
  userId: string;
  pseudonym: string;
  blockedAt: string;
}

export interface AdminMe {
  userId: string;
  email: string;
  pseudonym: string;
}

export interface AuditEntry {
  id: string;
  adminEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  reason: string | null;
  details: string | null;
  createdAt: string;
}

export interface AuditFacets {
  actions: string[];
  admins: string[];
  targetTypes: string[];
}

export interface AuditQuery {
  action?: string;
  /** An admin's email, or "system" for actions nobody took by hand. */
  admin?: string;
  targetType?: string;
  /** Free text over reason and details; a pasted id finds everything done to that target. */
  q?: string;
  /** ISO instants; `to` is exclusive. */
  from?: string;
  to?: string;
}

export type ReportReasonCode =
  | "FAKE_PROFILE"
  | "SCAM"
  | "HARASSMENT"
  | "UNDERAGE_SUSPICION"
  | "BLACKMAIL_ATTEMPT"
  | "OTHER";

export type ModerationActionCode = "DISMISS" | "WARN" | "SUSPEND" | "BAN";

export interface ReportSummary {
  id: string;
  reason: ReportReasonCode;
  status: "OPEN" | "REVIEWED" | "ACTIONED" | "DISMISSED";
  priority: boolean;
  reporterPseudonym: string;
  reportedUserId: string;
  reportedPseudonym: string;
  otherOpenReports: number;
  actionTaken: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface ReportPerson {
  userId: string;
  pseudonym: string;
  email: string;
  accountState: "ACTIVE" | "SUSPENDED" | "BANNED" | "DELETED";
  suspendedUntil: string | null;
  joinedAt: string;
  age: number | null;
  city: string | null;
  bio: string | null;
  photoCount: number;
  reportsAgainst: number;
  openReportsAgainst: number;
  reportsFiled: number;
  blocksReceived: number;
}

export interface ReportDetail {
  id: string;
  reason: ReportReasonCode;
  details: string | null;
  status: ReportSummary["status"];
  priority: boolean;
  createdAt: string;
  reporter: ReportPerson;
  reported: ReportPerson;
  resolution: {
    actionTaken: string;
    note: string;
    reviewedByEmail: string;
    resolvedAt: string;
  } | null;
  conversationAvailable: boolean;
}

export interface EvidenceResponse {
  /** SNAPSHOT: preserved when reported. LIVE: still exists, nothing preserved. NONE: no conversation. */
  source: "SNAPSHOT" | "LIVE" | "NONE";
  capturedAt: string | null;
  messages: ConversationMessage[];
}

export interface ConversationMessage {
  senderPseudonym: string;
  fromReportedUser: boolean;
  type: string;
  content: string;
  gift: string | null;
  sentAt: string;
}

export interface AdminUserSummary {
  userId: string;
  pseudonym: string;
  email: string;
  role: string;
  accountState: "ACTIVE" | "SUSPENDED" | "BANNED" | "DELETED";
  joinedAt: string;
  openReports: number;
  /** Null for people who deleted their account: their profile is gone. */
  gender: string | null;
  city: string | null;
  deletedAt: string | null;
  /** When they last used the app; null if they never have (and for people who deleted their account). */
  lastActiveAt: string | null;
}

/**
 * How recently members were last here. Days are whole days in India time (0 = today); the groups do not overlap and, with {@code never},
 * add up to {@code total}.
 */
export interface UserActivity {
  total: number;
  today: number;
  within7: number;
  within30: number;
  never: number;
  groups: { label: string; fromDays: number; toDays: number | null; members: number }[];
}

export interface UserFacets {
  cities: { key: string; label: string; members: number }[];
}

/** Everything the Users list can be narrowed by. Unset fields are not sent. */
export interface UserListQuery {
  q?: string;
  filter?: string;
  status?: "active" | "deleted" | "any";
  gender?: string;
  city?: string;
  /** With from/until: the people behind an analytics number. */
  event?: string;
  from?: string;
  until?: string;
  /** Whole days since last active (India time, 0 = today). idleMax may be left out for "and longer". */
  idleMin?: number;
  idleMax?: number;
  /** Members who have never been active. */
  never?: boolean;
}

export interface AdminUserDetail {
  userId: string;
  pseudonym: string;
  email: string;
  role: string;
  accountState: "ACTIVE" | "SUSPENDED" | "BANNED" | "DELETED";
  suspendedUntil: string | null;
  moderationMessage: string | null;
  joinedAt: string;
  lastActiveAt: string | null;
  passwordSet: boolean;
  age: number | null;
  gender: string | null;
  city: string | null;
  bio: string | null;
  photoCount: number;
  reportsAgainst: number;
  openReportsAgainst: number;
  reportsFiled: number;
  blocksReceived: number;
  blocksMade: number;
  recentReports: ReportSummary[];
  history: AuditEntry[];
  /** When they deleted their own account, if they did. */
  deletedAt: string | null;
  creditBalance: number;
}

export interface AdminPhoto {
  photoId: string;
  url: string;
  visibleToEveryone: boolean;
  primary: boolean;
  uploadedAt: string;
  ownerId: string | null;
  ownerPseudonym: string | null;
  ownerState: string | null;
}

/** Today's free likes. Every member has a limit; the number depends on gender. */
export interface LikeAllowance {
  limited: boolean;
  limit: number | null;
  remaining: number | null;
  /** What one more like costs, in credits, once the free ones are used. */
  extraLikeCost: number | null;
  resetsAt: string | null;
}

export interface LikeSummary {
  received: number;
  sent: number;
}

export interface Conversation {
  matchId: string;
  otherUser: Profile;
  lastMessage: Message | null;
  unreadCount: number;
  matchedAt: string;
}

export interface MatchSummary {
  matchId: string;
  otherUser: Profile;
  matchedAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  type: MessageType;
  gift: GiftKey | null;
  createdAt: string;
  /** For a picture: a short-lived link made for this viewer. Null for everything else. */
  imageUrl?: string | null;
  /** The reaction you left on this message, and the one they left. Null when there is none. */
  myReaction?: string | null;
  theirReaction?: string | null;
  /** What this message answers, if anything. */
  replyTo?: ReplyPreview | null;
  /** When the sender last changed the words, or null if they never did. */
  editedAt?: string | null;
}

/** A short view of the message a reply answers: enough to recognise it, never the picture itself. */
export interface ReplyPreview {
  id: string;
  /** True when the quoted message was yours. */
  mine: boolean;
  type: MessageType;
  text: string;
  gift: GiftKey | null;
}

/** The emotions that can be left on a message, in the order they are offered. */
export const REACTIONS = ["❤️", "👍", "😂", "😮", "😢", "🙏", "🔥", "😍"] as const;

export type ReportReason =
  | "FAKE_PROFILE"
  | "SCAM"
  | "HARASSMENT"
  | "UNDERAGE_SUSPICION"
  | "BLACKMAIL_ATTEMPT"
  | "OTHER";

/** A bundle of credits on sale. The server decides the price; this is only what to show. */
export interface CreditPack {
  id: string;
  credits: number;
  /** Whole rupees. */
  amountInr: number;
}

export interface PackCatalogue {
  /** False until payments are set up on the server; nothing can be bought then. */
  enabled: boolean;
  environment: "sandbox" | "production";
  packs: CreditPack[];
  /** The GST that is already in every price, as a percent. Prices are inclusive: what is shown is what is paid. */
  gstPercent?: number;
  gstIncluded?: boolean;
}

/** One of a member's own invoices. */
export interface MemberInvoice {
  orderId: string;
  invoiceNumber: string;
  issuedAt: string;
  grossPaise: number;
  gstPaise: number;
  credits: number;
}

export interface PaymentCheckout {
  orderId: string;
  paymentSessionId: string;
  environment: "sandbox" | "production";
}

export type PaymentStatus = "CREATED" | "PAID" | "EXPIRED" | "FAILED";

export interface WalletData {
  balance: number;
  transactions: { amount: number; label: string; createdAt: string }[];
}

/**
 * What writing costs the sender, in credits. `textCost` is the very next text (0 when free), `followUpCost` each one
 * after it until the other person writes back, and `unmatched` is true while that still applies.
 */
export interface MessagePricing {
  textCost: number;
  followUpCost: number;
  unmatched: boolean;
}

/** The Android beta as the public download page sees it. Everything is null until an admin has published a build. */
export interface AndroidRelease {
  available: boolean;
  versionName: string | null;
  notes: string | null;
  sizeBytes: number | null;
  sha256: string | null;
  publishedAt: string | null;
}

export interface AppReleaseInfo {
  id: string;
  versionName: string;
  notes: string | null;
  sizeBytes: number;
  sha256: string;
  current: boolean;
  /** Kept in file storage rather than in the database; the download link still counts, then sends people on. */
  hosted: boolean;
  uploadedAt: string;
  publishedAt: string | null;
  downloads: number;
}

/** What the admin console shows: how often the app was downloaded, and every uploaded build. */
export interface AppReleasesOverview {
  total: number;
  today: number;
  last7Days: number;
  last30Days: number;
  daily: { day: string; downloads: number }[];
  releases: AppReleaseInfo[];
  uploadEnabled: boolean;
  maxUploadMb: number;
  /** Where hosted builds may be linked from; empty when the server isn't set up for it. */
  hostedBaseUrl: string;
}


// ---- admin: payments

export interface PaymentMetric {
  value: number;
  previous: number;
}

export interface PaymentsSummary {
  gateway: { enabled: boolean; environment: string };
  granularity: Granularity;
  from: string;
  to: string;
  lastBucketPartial: boolean;
  /** Money is in paise. Revenue includes GST. */
  revenuePaise: PaymentMetric;
  /** Revenue without the GST in it, and the GST in it. */
  taxablePaise: PaymentMetric;
  gstPaise: PaymentMetric;
  tax: {
    ratePercent: number;
    sac: string;
    /** False until the seller's details are set on the server: no invoices are issued before that. */
    invoicesEnabled: boolean;
    missing: string[];
    sellerState: string;
    placeOfSupply: string;
    description: string;
    /** Settings that would name the service on an invoice, which may be seen by others. */
    discretionWarnings: string[];
  };
  /** Paid orders with no invoice yet. */
  paidWithoutInvoice: number;
  paidOrders: PaymentMetric;
  creditsSold: PaymentMetric;
  payingMembers: PaymentMetric;
  startedOrders: PaymentMetric;
  conversionPercent: PaymentMetric;
  averageOrderPaise: PaymentMetric;
  repeatBuyers: number;
  failedOrders: number;
  abandonedOrders: number;
  pendingOrders: number;
  attention: { amountMismatches: number; mismatchPaise: number; stuckOrders: number; failedToStart: number };
  series: AnalyticsSeries[];
  byPack: { packId: string; orders: number; revenuePaise: number; credits: number }[];
  economy: { inCirculation: number; lines: { reason: string; label: string; entries: number; credits: number }[] };
}

export type PaymentOrderStatus = "PAID" | "PENDING" | "ABANDONED" | "FAILED";

export interface PaymentMember {
  userId: string;
  pseudonym: string;
  email: string;
  deleted: boolean;
}

export interface PaymentOrderRow {
  orderId: string;
  createdAt: string;
  paidAt: string | null;
  status: PaymentOrderStatus;
  failureReason: "START_FAILED" | "AMOUNT_MISMATCH" | null;
  packId: string;
  credits: number;
  amountPaise: number;
  currency: string;
  cashfreeOrderId: string | null;
  taxablePaise: number;
  gstPaise: number;
  invoiceNumber: string | null;
  invoiceEmailed: boolean;
  member: PaymentMember;
}

export interface PaymentOrderPage {
  total: number;
  page: number;
  size: number;
  rows: PaymentOrderRow[];
}

export interface LedgerRow {
  id: string;
  createdAt: string;
  reason: string;
  label: string;
  credits: number;
  reference: string | null;
  member: PaymentMember;
}

export interface LedgerPage {
  total: number;
  page: number;
  size: number;
  rows: LedgerRow[];
}

export interface PaymentFilters {
  status?: string;
  q?: string;
  from?: string;
  to?: string;
}

// --- Sponsored placements ---------------------------------------------------------------------------------------

export type AdPlacement = "DISCOVER" | "LIKES" | "MATCHES" | "MESSAGES" | "CONVERSATION";

/** What a member's screen is given. The paths are relative to the API address. */
export interface ServedAd {
  id: string;
  title: string;
  body: string | null;
  ctaLabel: string;
  imagePath: string | null;
  clickPath: string;
  label: string;
  /** Messages list only: the (zero-based) conversation this row goes under. */
  position?: number | null;
  /** An offer line such as "15% off your first booking", or null. */
  offerText?: string | null;
  /** The offer has a code. The code is not in the ad: "Show code" asks for it, and that is counted. */
  hasCode?: boolean;
  /** Which creative of the ad this is (A to D); handed back when the page reports the ad seen or closed. */
  variant?: string;
  /** One plain sentence on why this ad is shown: who the advertiser chose to reach. */
  why?: string;
}

export interface AdCounts {
  impressions: number;
  clicks: number;
}

/**
 * From showing to clicking. {@code measured} is the showings to a screen that reports whether the ad was on screen (older apps do
 * not), so {@code seen} and {@code hidden} are judged against it, not against {@code delivered}. {@code firstTime} is showings of an
 * ad the device had not shown in the last week: a rough count of new people reached.
 */
export interface AdFunnel {
  delivered: number;
  measured: number;
  seen: number;
  hidden: number;
  firstTime: number;
  clicks: number;
  /** Times "Show code" was tapped. */
  reveals: number;
  /** Sign-ups or bookings the advertiser's server reported back against a click. */
  conversions: number;
}

export type AdStatus = "DRAFT" | "REJECTED" | "RUNNING" | "SCHEDULED" | "PAUSED" | "ENDED" | "LIMIT_REACHED";

export interface AdminAd {
  id: string;
  advertiser: string;
  title: string;
  body: string | null;
  ctaLabel: string;
  targetUrl: string;
  /** Every place the ad runs in, in the fixed order Discover, Likes, Matches, Messages. */
  placements: AdPlacement[];
  /** Where the ad is aimed; empty means everyone. */
  locations: { key: string; label: string }[];
  startsAt: string;
  endsAt: string | null;
  active: boolean;
  weight: number;
  /** Most showings of this ad per person per day; null = no limit. */
  maxPerDay: number | null;
  /** Hours before the same person is shown it again; null = no wait. */
  minGapHours: number | null;
  impressionCap: number | null;
  remaining: number | null;
  hasImage: boolean;
  imagePath: string | null;
  status: AdStatus;
  total: AdCounts;
  today: AdCounts;
  last7Days: AdCounts;
  web: AdCounts;
  android: AdCounts;
  /** The same totals place by place; empty until the ad has been shown. */
  byPlacement: { placement: AdPlacement; counts: AdCounts; funnel: AdFunnel }[];
  funnel: AdFunnel;
  funnelWeb: AdFunnel;
  funnelAndroid: AdFunnel;
  /** What it is priced at and has earned; null when no price is recorded. */
  pricing: AdPricing | null;
  /** Against the number of showings sold; null unless a number was sold and the ad has an end. */
  pacing: AdPacing | null;
  /** The advertiser's read-only link; null when there is none. */
  reportLink: AdReportLink | null;
  /** The offer as entered (with its code); null when the ad has none. */
  offer: { text: string; code: string | null } | null;
  /** Whether clicks carry a token the advertiser can report conversions against, and the secret that proves a report is theirs. */
  tracking: { enabled: boolean; key: string | null };
  /** What the advertiser says was redeemed, as entered by an admin. */
  redeemed: number;
  category: string;
  /** DRAFT waits for an admin's approval and is not shown; REJECTED carries the reason in {@code note}. */
  review: { status: "DRAFT" | "APPROVED" | "REJECTED"; note: string | null; reviewedAt: string | null };
  /** The days and hours the ad may run (India time), and whether that allows it right now. */
  schedule: { days: number; from: number | null; to: number | null; onNow: boolean; text: string };
  /** With several creatives: most traffic goes to the best one once each has had a fair sample. */
  autoOptimise: boolean;
  /** The ad's own creative (A) and the others with their counts; empty when the ad has only one. */
  creatives: AdCreative[];
  /** Member reports in the last 7 days that nobody has dismissed. */
  openReports: number;
}

export interface AdCreative {
  label: string;
  title: string;
  body: string | null;
  ctaLabel: string;
  imagePath: string | null;
  active: boolean;
  shown: number;
  seen: number;
  clicked: number;
  hidden: number;
  /** The best click rate, named only once every active creative has had a fair sample. */
  leading: boolean;
}

/** A member's report of an ad: the reason, an optional note, where it was seen; never who. */
export interface AdFlag {
  id: string;
  reason: "MISLEADING" | "OFFENSIVE" | "SCAM" | "IRRELEVANT" | "OTHER";
  note: string | null;
  platform: "WEB" | "ANDROID";
  placement: AdPlacement | null;
  createdAt: string;
  dismissed: boolean;
}

/** Who may advertise, how an ad gets approved, when reports pause an ad, and the share of members who see no ads. */
export interface AdPolicy {
  requireApproval: boolean;
  blockedCategories: string[];
  blockedTerms: string[];
  reportsToPause: number;
  holdoutPercent: number;
}

export interface AdCategoryOption {
  value: string;
  label: string;
}

export interface AdHoldoutGroup {
  name: string;
  members: number;
  avgActiveDays: number;
  percentMessaged: number;
  avgMessages: number;
  percentBought: number;
}

export interface AdHoldoutReport {
  running: boolean;
  percent: number;
  startedAt: string | null;
  daysRunning: number;
  holdout: AdHoldoutGroup | null;
  shownAds: AdHoldoutGroup | null;
  enoughMembers: boolean;
  note: string;
}

/** One line of "the advertiser says this many codes were used on this day". */
export interface AdRedemption {
  id: string;
  day: string;
  count: number;
  note: string | null;
  createdAt: string;
}

/** {@code rupees} is the fee (FLAT) or the rate per 1,000 showings (CPM). */
export interface AdPricing {
  model: "FLAT" | "CPM";
  rupees: number;
  bookedRupees: number;
  earnedRupees: number;
  costPerClick: number | null;
  perThousandShown: number | null;
}

export type AdPacingState = "NOT_STARTED" | "ON_TRACK" | "BEHIND" | "AHEAD" | "DONE" | "ENDED_SHORT";

export interface AdPacing {
  state: AdPacingState;
  /** How many showings should have happened by now if they were spread evenly. */
  expected: number;
  ratio: number;
  deliveredPercent: number;
}

/** {@code validUntil} is null for an ad with no end date: the link works until it is ended. */
export interface AdReportLink {
  token: string;
  validUntil: string | null;
  active: boolean;
}

/** What an advertiser sees through their link. Counts only, and never the price. */
export interface AdReport {
  title: string;
  body: string | null;
  ctaLabel: string;
  imagePath: string | null;
  placements: AdPlacement[];
  startsAt: string;
  endsAt: string | null;
  status: "RUNNING" | "SCHEDULED" | "PAUSED" | "ENDED";
  validUntil: string | null;
  generatedAt: string;
  sold: number | null;
  offerText: string | null;
  hasCode: boolean;
  /** Codes the advertiser reported redeemed, as entered by Privlee. */
  redeemed: number;
  tracksConversions: boolean;
  total: AdFunnel;
  web: AdFunnel;
  android: AdFunnel;
  byPlacement: { placement: AdPlacement; funnel: AdFunnel }[];
  daily: { day: string; shown: number; seen: number; clicked: number }[];
}

export interface AdDay {
  day: string;
  impressionsWeb: number;
  impressionsAndroid: number;
  clicksWeb: number;
  clicksAndroid: number;
}

export interface AdsOverview {
  summary: {
    runningNow: number;
    totalCampaigns: number;
    today: AdCounts;
    last7Days: AdCounts;
    last30Days: AdCounts;
    web30Days: AdCounts;
    android30Days: AdCounts;
    funnel30Days: AdFunnel;
    daily: AdDay[];
    byPlacement: { placement: AdPlacement; last30Days: AdCounts }[];
  };
  ads: AdminAd[];
  settings: AdSettings;
  policy: AdPolicy;
  categories: AdCategoryOption[];
  /** True when the server itself has ads switched off (ADS_ENABLED=false), whatever the settings say. */
  switchedOffOnServer: boolean;
  maxImageKb: number;
}

/** The rules that apply to every ad, edited on the Ads page. */
export interface AdSettings {
  enabled: boolean;
  maxPerDayAnyAd: number;
  newMemberGraceHours: number;
  adFreeDaysAfterPurchase: number;
  messagesFirstAfter: number;
  messagesEvery: number;
  messagesMaxRows: number;
  messagesShortListRow: boolean;
  /** Inside a conversation: after this message, then every so many, at most this many in one conversation, latest messages kept clear. */
  chatFirstAfter: number;
  chatEvery: number;
  chatMaxRows: number;
  chatKeepLatestClear: number;
  disabledPlacements: AdPlacement[];
}

/** What the admin form sends. Dates are ISO strings in UTC, or empty. */
export interface AdForm {
  advertiser: string;
  title: string;
  body: string;
  ctaLabel: string;
  targetUrl: string;
  placements: AdPlacement[];
  /** Location keys such as "state:karnataka" and "city:bengaluru"; empty means everyone. */
  locations: string[];
  startsAt: string;
  endsAt: string;
  weight: number;
  impressionCap: string;
  maxPerDay: string;
  minGapHours: string;
  /** What the ad is sold for: "" (not recorded), "FLAT" (a fee for the run) or "CPM" (a rate per 1,000 showings). */
  priceModel: "" | "FLAT" | "CPM";
  priceRupees: string;
  /** An offer line and the code shown after "Show code". Both empty means no offer. */
  offerText: string;
  offerCode: string;
  /** Clicks carry a token the advertiser can report sign-ups or bookings against. */
  trackConversions: boolean;
  category: string;
  /** Days the ad may run: bit 0 = Monday ... bit 6 = Sunday. 127 = every day. */
  daysMask: number;
  /** The hours it may run (India time), 0-23 and 1-24; both empty = all day. */
  hoursFrom: string;
  hoursTo: string;
}

/** A state or city an ad can be aimed at. `state` is the key of the state a city is in. */
export interface AdLocationOption {
  key: string;
  label: string;
  kind: "state" | "city";
  state: string | null;
  /** Other names for the same city, for searching (Bangalore for Bengaluru). */
  aliases: string[];
}

export interface AdReach {
  members: number;
  total: number;
}
