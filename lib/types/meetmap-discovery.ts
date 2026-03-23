export type EventCard = {
  id: string;
  title: string;
  city: string;
  category: string;
  startsAt: string;
  description: string;
};

export type UserSettings = {
  homeCity?: string | null;
  interestedActivities: string[];
};

export type SearchEventsInput = {
  city: string;
  dateText?: string | null;
  categories?: string[];
};

export type DiscoveryResult = {
  summary: string;
  usedCity: string;
  usedPreferences: boolean;
  fallbackUsed: "none" | "popular-events";
  events: EventCard[];
};
