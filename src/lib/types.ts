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
}

export type ProfileUpdate = Pick<
  Profile,
  "lookingFor" | "relationshipStatus" | "city" | "discreetMode"
> &
  Partial<ProfileExtras> & { bio: string };

export interface AuthResponse {
  accessToken: string;
  userId: string;
  pseudonym: string;
  /** True once someone who deleted their account has proved they own the email again. */
  welcomeBack?: boolean;
}

export interface SignupPayload extends Partial<ProfileExtras> {
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
  unit: "count" | "seconds";
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

export type MessageType = "TEXT" | "WINK" | "GIFT";

export type GiftKey =
  | "ROSE"
  | "BOUQUET"
  | "CHOCOLATES"
  | "CHAMPAGNE"
  | "COFFEE"
  | "PERFUME"
  | "CAKE"
  | "TEDDY";

export interface GiftOption {
  key: GiftKey;
  label: string;
  emoji: string;
  cost: number;
}

export type NotificationType =
  | "LIKE_RECEIVED"
  | "MATCH"
  | "MESSAGE"
  | "GIFT"
  | "PHOTO_ACCESS_REQUESTED"
  | "PHOTO_ACCESS_GRANTED"
  | "PHOTO_ACCESS_REVOKED"
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
}

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

/** What the next text costs the sender, in credits. 0 when it is free. */
export interface MessagePricing {
  textCost: number;
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
}
