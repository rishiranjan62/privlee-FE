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

export interface Photo {
  id: string;
  url: string;
  blurred: boolean;
  primary: boolean;
}

export interface Profile {
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
}

export interface AuthResponse {
  accessToken: string;
  userId: string;
  pseudonym: string;
}

export interface SignupPayload {
  email: string;
  password: string;
  pseudonym: string;
  dateOfBirth: string;
  gender: Gender;
  lookingFor: LookingFor;
  relationshipStatus: RelationshipStatus;
  city: string;
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
  createdAt: string;
}

export type ReportReason =
  | "FAKE_PROFILE"
  | "SCAM"
  | "HARASSMENT"
  | "UNDERAGE_SUSPICION"
  | "BLACKMAIL_ATTEMPT"
  | "OTHER";
