export const lookingForLabels: Record<string, string> = {
  AFFAIR: "An affair",
  EMOTIONAL_CONNECTION: "Emotional connection",
  FRIENDSHIP: "Friendship",
  CASUAL: "Something casual",
  OPEN_RELATIONSHIP: "Open relationship",
};

export const relationshipLabels: Record<string, string> = {
  MARRIED: "Married",
  ATTACHED: "Attached",
  OPEN_RELATIONSHIP: "Open relationship",
  DIVORCED: "Divorced",
  SINGLE: "Single",
};

export const smokingLabels: Record<string, string> = {
  NEVER: "Doesn't smoke",
  OCCASIONALLY: "Smokes occasionally",
  REGULARLY: "Smokes regularly",
};

export const drinkingLabels: Record<string, string> = {
  NEVER: "Doesn't drink",
  SOCIALLY: "Drinks socially",
  REGULARLY: "Drinks regularly",
};

export const discretionLabels: Record<string, string> = {
  MAXIMUM: "Maximum discretion",
  HIGH: "Discreet",
  RELAXED: "Relaxed about it",
};

export const availabilityLabels: Record<string, string> = {
  WEEKDAY_DAYTIME: "Weekday daytimes",
  WEEKDAY_EVENINGS: "Weekday evenings",
  WEEKENDS: "Weekends",
  LATE_NIGHT: "Late nights",
};

/** Short forms used inside the profile editor, where the subject is already "you". */
export const smokingOptions = [
  { value: "NEVER", label: "Never" },
  { value: "OCCASIONALLY", label: "Occasionally" },
  { value: "REGULARLY", label: "Regularly" },
] as const;

export const drinkingOptions = [
  { value: "NEVER", label: "Never" },
  { value: "SOCIALLY", label: "Socially" },
  { value: "REGULARLY", label: "Regularly" },
] as const;

export const discretionOptions = [
  { value: "MAXIMUM", label: "Maximum" },
  { value: "HIGH", label: "Discreet" },
  { value: "RELAXED", label: "Relaxed" },
] as const;

export const availabilityOptions = [
  { value: "WEEKDAY_DAYTIME", label: "Weekday daytimes" },
  { value: "WEEKDAY_EVENINGS", label: "Weekday evenings" },
  { value: "WEEKENDS", label: "Weekends" },
  { value: "LATE_NIGHT", label: "Late nights" },
] as const;

export const INTEREST_SUGGESTIONS = [
  "Travel",
  "Live music",
  "Cooking",
  "Long drives",
  "Reading",
  "Fitness",
  "Art",
  "Film",
  "Coffee",
  "Hiking",
  "Dancing",
  "Photography",
];

export const GIFT_LABELS: Record<string, string> = {
  ROSE: "A rose",
  BOUQUET: "A bouquet",
  CHOCOLATES: "Chocolates",
  CHAMPAGNE: "Champagne",
  COFFEE: "A coffee",
  PERFUME: "Perfume",
  CAKE: "Something sweet",
  TEDDY: "A teddy",
  HEART: "A heart",
  KISS: "A kiss",
  HUG: "A hug",
  FIRE: "Some fire",
  STAR: "A star",
  SUNFLOWER: "A sunflower",
  BALLOON: "A balloon",
  WINE: "A glass of wine",
  ICE_CREAM: "Ice cream",
  CHERRIES: "Cherries",
  CANDLE: "A candle",
  MOONLIGHT: "Moonlight",
  PARTY: "A little party",
  DIAMOND: "A diamond",
  CROWN: "A crown",
  RING: "A ring",
  BLINDFOLD: "A blindfold",
  HANDCUFFS: "Handcuffs",
  SILK_SCARF: "A silk scarf",
  FEATHER: "A feather",
  MASK: "A masquerade mask",
  ROOM_KEY: "The key to my room",
  HOTEL: "A night at a hotel",
  HEELS: "High heels",
  LACE: "Something lacy",
  OIL: "Massage oil",
  DICE: "Dice for two",
  PEACH: "A ripe peach",
  SPICE: "Something spicy",
  STRAWBERRIES: "Strawberries",
  WHISPER: "A whispered secret",
  SECRET_NOTE: "A secret note",
  MIDNIGHT: "A midnight meeting",
  SATIN: "Satin sheets",
  VELVET_GLOVES: "Velvet gloves",
  BUNNY_EARS: "Bunny ears",
  POTION: "A love potion",
  HOT_TUB: "A hot tub for two",
  DINNER: "Dinner for two, just us",
};

export const GIFT_EMOJI: Record<string, string> = {
  ROSE: "🌹",
  BOUQUET: "💐",
  CHOCOLATES: "🍫",
  CHAMPAGNE: "🥂",
  COFFEE: "☕",
  PERFUME: "🌸",
  CAKE: "🍰",
  TEDDY: "🧸",
  HEART: "💖",
  KISS: "💋",
  HUG: "🤗",
  FIRE: "🔥",
  STAR: "🌟",
  SUNFLOWER: "🌻",
  BALLOON: "🎈",
  WINE: "🍷",
  ICE_CREAM: "🍦",
  CHERRIES: "🍒",
  CANDLE: "🕯️",
  MOONLIGHT: "🌙",
  PARTY: "🎉",
  DIAMOND: "💎",
  CROWN: "👑",
  RING: "💍",
  BLINDFOLD: "🕶️",
  HANDCUFFS: "⛓️",
  SILK_SCARF: "🧣",
  FEATHER: "🦚",
  MASK: "🎭",
  ROOM_KEY: "🗝️",
  HOTEL: "🏨",
  HEELS: "👠",
  LACE: "👙",
  OIL: "🧴",
  DICE: "🎲",
  PEACH: "🍑",
  SPICE: "🌶️",
  STRAWBERRIES: "🍓",
  WHISPER: "🤫",
  SECRET_NOTE: "💌",
  MIDNIGHT: "🌃",
  SATIN: "🛏️",
  VELVET_GLOVES: "🧤",
  BUNNY_EARS: "🐰",
  POTION: "🧪",
  HOT_TUB: "♨️",
  DINNER: "🍽️",
};

export const genderLabels: Record<string, string> = {
  MALE: "Male",
  FEMALE: "Female",
  NON_BINARY: "Non-binary",
  OTHER: "Other",
};
