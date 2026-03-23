import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import {
  buildMeetMapRankingPrompt,
  meetMapIntentPrompt,
} from "@/lib/ai/system-prompt";
import { getPopularEvents } from "@/lib/events/get-popular-events";
import { searchEvents } from "@/lib/events/search-events";
import type {
  DiscoveryResult,
  EventCard,
} from "@/lib/types/meetmap-discovery";
import { getUserSettings } from "@/lib/user/get-user-settings";
import { findCityInText } from "@/src/lib/cities";

export const runtime = "nodejs";

const DEFAULT_FALLBACK_CITY = "Tel Aviv";
const GEMINI_MODEL = "gemini-2.5-flash";

type RequestBody = {
  query?: unknown;
  userId?: unknown;
};

type DiscoveryIntent = {
  city: string | null;
  dateText: string | null;
  categories: string[];
  vibe: string | null;
};

type RankedDiscoveryResponse = {
  summary: string;
  events: EventCard[];
};

function parseJsonObject(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractJsonObjectText(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const withoutCodeFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  if (withoutCodeFence.startsWith("{") && withoutCodeFence.endsWith("}")) {
    return withoutCodeFence;
  }

  const firstBrace = withoutCodeFence.indexOf("{");
  const lastBrace = withoutCodeFence.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  return withoutCodeFence.slice(firstBrace, lastBrace + 1);
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseIntent(value: unknown): DiscoveryIntent | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  return {
    city: normalizeOptionalString(candidate.city),
    dateText: normalizeOptionalString(candidate.dateText),
    categories: Array.isArray(candidate.categories)
      ? candidate.categories
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
      : [],
    vibe: normalizeOptionalString(candidate.vibe),
  };
}

function isEventCard(value: unknown): value is EventCard {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.city === "string" &&
    typeof candidate.category === "string" &&
    typeof candidate.startsAt === "string" &&
    typeof candidate.description === "string"
  );
}

function parseRankedDiscoveryResponse(value: unknown): RankedDiscoveryResponse | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.summary !== "string" || !Array.isArray(candidate.events)) {
    return null;
  }

  const events = candidate.events.filter(isEventCard);
  return {
    summary: candidate.summary,
    events,
  };
}

function uniqueEvents(events: EventCard[]) {
  const seen = new Set<string>();
  return events.filter((event) => {
    if (seen.has(event.id)) {
      return false;
    }

    seen.add(event.id);
    return true;
  });
}

async function generateGeminiJson(
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  prompt: string,
) {
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const extractedJson = extractJsonObjectText(text);

  if (!extractedJson) {
    return null;
  }

  return parseJsonObject(extractedJson);
}

function normalizeCategories(categories: string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const category of categories) {
    const trimmed = category.trim().toLowerCase();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
}

function selectValidatedEvents(
  candidateEvents: EventCard[],
  availableEvents: Map<string, EventCard>,
) {
  const validated: EventCard[] = [];
  const seen = new Set<string>();

  for (const event of candidateEvents) {
    const toolBackedEvent = availableEvents.get(event.id);
    if (!toolBackedEvent || seen.has(toolBackedEvent.id)) {
      continue;
    }

    seen.add(toolBackedEvent.id);
    validated.push(toolBackedEvent);
  }

  return validated;
}

export async function POST(request: Request) {
  try {
    let body: RequestBody;
    try {
      body = (await request.json()) as RequestBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const query = typeof body.query === "string" ? body.query.trim() : "";
    const userId =
      typeof body.userId === "string" && body.userId.trim().length > 0
        ? body.userId.trim()
        : null;

    if (!query) {
      return NextResponse.json(
        { error: "Query must be a non-empty string." },
        { status: 400 },
      );
    }

    const userSettings = await getUserSettings(userId ?? "");

    let geminiModel: ReturnType<GoogleGenerativeAI["getGenerativeModel"]> | null = null;
    if (process.env.GEMINI_API_KEY) {
      const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      geminiModel = gemini.getGenerativeModel({ model: GEMINI_MODEL });
    }

    let intent: DiscoveryIntent = {
      city: null,
      dateText: null,
      categories: [],
      vibe: null,
    };

    try {
      if (geminiModel) {
        const parsedIntent = await generateGeminiJson(
          geminiModel,
          `${meetMapIntentPrompt}\n\nUser query:\n${query}`,
        );
        const safeIntent = parseIntent(parsedIntent);
        if (safeIntent) {
          intent = safeIntent;
        }
      }
    } catch {
      // Fall back to safe defaults if Gemini intent extraction fails.
    }

    const queryDetectedCity = findCityInText(query);
    const usedCity =
      intent.city?.trim() ||
      queryDetectedCity ||
      userSettings.homeCity?.trim() ||
      DEFAULT_FALLBACK_CITY;
    const intentCategories = normalizeCategories(intent.categories);
    const preferenceCategories = normalizeCategories(
      userSettings.interestedActivities,
    );
    const resolvedCategories =
      intentCategories.length > 0 ? intentCategories : preferenceCategories;
    const usedPreferences =
      intentCategories.length === 0 && resolvedCategories.length > 0;

    const { events: initialEvents } = await searchEvents({
      city: usedCity,
      dateText: intent.dateText,
      categories: resolvedCategories.length > 0 ? resolvedCategories : undefined,
    });

    let fallbackUsed: DiscoveryResult["fallbackUsed"] = "none";
    let mergedEvents = [...initialEvents];

    if (mergedEvents.length < 3) {
      const { events: fallbackEvents } = await getPopularEvents({
        city: usedCity,
        dateText: intent.dateText,
      });
      mergedEvents = uniqueEvents([...mergedEvents, ...fallbackEvents]);
      fallbackUsed = fallbackEvents.length > 0 ? "popular-events" : "none";
    }

    const availableEvents = new Map(mergedEvents.map((event) => [event.id, event]));
    let rankedEvents = mergedEvents.slice(0, 5);
    let summary =
      rankedEvents.length > 0
        ? `Here are some MeetMap activities in ${usedCity} that match your search.`
        : `No MeetMap activities were found in ${usedCity} for this search.`;

    try {
      if (geminiModel && mergedEvents.length > 0) {
        const rankedPayload = await generateGeminiJson(
          geminiModel,
          buildMeetMapRankingPrompt({
            query,
            usedCity,
            categories: resolvedCategories,
            eventsJson: JSON.stringify(mergedEvents),
          }),
        );
        const rankedResponse = parseRankedDiscoveryResponse(rankedPayload);

        if (rankedResponse?.summary?.trim()) {
          summary = rankedResponse.summary.trim();
        }

        if (rankedResponse) {
          const validatedRankedEvents = selectValidatedEvents(
            rankedResponse.events,
            availableEvents,
          );
          if (validatedRankedEvents.length > 0) {
            rankedEvents = validatedRankedEvents.slice(0, 5);
          }
        }
      }
    } catch {
      // Keep tool-backed events even if Gemini ranking fails.
    }

    if (rankedEvents.length === 0 && mergedEvents.length > 0) {
      rankedEvents = mergedEvents.slice(0, 5);
    }

    const response: DiscoveryResult = {
      summary,
      usedCity,
      usedPreferences,
      fallbackUsed,
      events: rankedEvents,
    };

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "production"
            ? "Server error while running AI discovery."
            : `Server error while running AI discovery: ${message}`,
      },
      { status: 500 },
    );
  }
}
