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

export interface Metrics {
  totals: Record<string, number>;
  series: MetricsSeries[];
}

export interface GoogleLoginResult {
  profileRequired: boolean;
  auth: AuthResponse | null;
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
  | "PHOTO_ACCESS_REVOKED";

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
  accountState: "ACTIVE" | "SUSPENDED" | "BANNED";
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
  accountState: "ACTIVE" | "SUSPENDED" | "BANNED";
  joinedAt: string;
  openReports: number;
}

export interface AdminUserDetail {
  userId: string;
  pseudonym: string;
  email: string;
  role: string;
  accountState: "ACTIVE" | "SUSPENDED" | "BANNED";
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
