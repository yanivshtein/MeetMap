import type { EventCategory } from "@/src/lib/eventCategories";
import { getCached, makeCacheKey, setCached } from "@/src/lib/eventsCache";
import type { Event } from "@/src/types/event";

export type EventsFilters = {
  q?: string;
  from?: string;
  to?: string;
  category?: EventCategory;
};

export type EventsBounds = {
  north?: number;
  south?: number;
  east?: number;
  west?: number;
};

export type EventsFetchParams = EventsFilters &
  EventsBounds & {
    categories?: EventCategory[];
  };

function normalizeFromDate(value?: string) {
  if (!value) {
    return undefined;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T00:00:00.000Z`;
  }

  return value;
}

function normalizeToDate(value?: string) {
  if (!value) {
    return undefined;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T23:59:59.999Z`;
  }

  return value;
}

export async function fetchEvents(
  { q, from, to, category, categories, north, south, east, west }: EventsFetchParams,
  signal?: AbortSignal,
): Promise<Event[]> {
  const cacheKey = makeCacheKey({
    q,
    from,
    to,
    category,
    categories,
    north,
    south,
    east,
    west,
  });
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  const params = new URLSearchParams();

  if (q?.trim()) {
    params.set("q", q.trim());
  }

  const normalizedFrom = normalizeFromDate(from);
  const normalizedTo = normalizeToDate(to);

  if (normalizedFrom) {
    params.set("from", normalizedFrom);
  }

  if (normalizedTo) {
    params.set("to", normalizedTo);
  }

  if (category) {
    params.set("category", category);
  }

  if (categories && categories.length > 0) {
    params.set("categories", categories.join(","));
  }

  if (typeof north === "number" && Number.isFinite(north)) {
    params.set("north", String(north));
  }
  if (typeof south === "number" && Number.isFinite(south)) {
    params.set("south", String(south));
  }
  if (typeof east === "number" && Number.isFinite(east)) {
    params.set("east", String(east));
  }
  if (typeof west === "number" && Number.isFinite(west)) {
    params.set("west", String(west));
  }

  const query = params.toString();
  const response = await fetch(`/api/events${query ? `?${query}` : ""}`, {
    method: "GET",
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error("Failed to fetch events");
  }

  const data = (await response.json()) as Event[];
  const safeData = Array.isArray(data) ? data : [];
  setCached(cacheKey, safeData);
  return safeData;
}
