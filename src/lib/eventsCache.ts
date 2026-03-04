import type { EventsFetchParams } from "@/src/lib/eventsApi";
import type { Event } from "@/src/types/event";

const BOUNDS_PRECISION = 3;
export const EVENTS_CACHE_TTL_MS = 30_000;

type CacheEntry = {
  data: Event[];
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

function round(value: number, precision: number) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function makeCacheKey(params: EventsFetchParams): string {
  const normalized = {
    q: params.q?.trim() || "",
    from: params.from || "",
    to: params.to || "",
    category: params.category || "",
    categories:
      params.categories
        ?.map((value) => value.trim())
        .filter(Boolean)
        .sort()
        .join(",") || "",
    north:
      typeof params.north === "number"
        ? round(params.north, BOUNDS_PRECISION)
        : "",
    south:
      typeof params.south === "number"
        ? round(params.south, BOUNDS_PRECISION)
        : "",
    east:
      typeof params.east === "number"
        ? round(params.east, BOUNDS_PRECISION)
        : "",
    west:
      typeof params.west === "number"
        ? round(params.west, BOUNDS_PRECISION)
        : "",
  };

  return JSON.stringify(normalized);
}

export function getCached(key: string): Event[] | null {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

export function setCached(key: string, data: Event[]): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + EVENTS_CACHE_TTL_MS,
  });
}
