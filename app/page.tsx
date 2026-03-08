"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EventsPanel from "@/src/components/EventsPanel";
import MapEventsClient from "@/src/components/MapEventsClient";
import type { MapBounds } from "@/src/components/MapEvents";
import { debounce } from "@/src/lib/debounce";
import { makeCacheKey } from "@/src/lib/eventsCache";
import { type EventCategory } from "@/src/lib/eventCategories";
import {
  fetchEvents,
  type EventsBounds,
  type EventsFilters,
} from "@/src/lib/eventsApi";
import { useSessionClient } from "@/src/lib/sessionClient";
import type { Event } from "@/src/types/event";

const BOUNDS_PRECISION = 3;

function roundToPrecision(value: number, precision: number) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function normalizeBounds(bounds: MapBounds): EventsBounds {
  return {
    north: roundToPrecision(bounds.north, BOUNDS_PRECISION),
    south: roundToPrecision(bounds.south, BOUNDS_PRECISION),
    east: roundToPrecision(bounds.east, BOUNDS_PRECISION),
    west: roundToPrecision(bounds.west, BOUNDS_PRECISION),
  };
}

function sameEventIdsInOrder(a: Event[], b: Event[]) {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i += 1) {
    if (a[i]?.id !== b[i]?.id) {
      return false;
    }
  }

  return true;
}

export default function HomePage() {
  const { isAuthenticated } = useSessionClient();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [pendingFocusEventId, setPendingFocusEventId] = useState<string | null>(
    null,
  );
  const [filters, setFilters] = useState<EventsFilters>({});
  const [bounds, setBounds] = useState<EventsBounds | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastFetchKeyRef = useRef<string | null>(null);

  const handleBoundsChange = useCallback((nextBounds: MapBounds) => {
    const rounded = normalizeBounds(nextBounds);

    setBounds((prev) => {
      if (
        prev &&
        prev.north === rounded.north &&
        prev.south === rounded.south &&
        prev.east === rounded.east &&
        prev.west === rounded.west
      ) {
        return prev;
      }

      return rounded;
    });
  }, []);
  const handleSelectEvent = useCallback((id: string) => {
    setSelectedEventId(id);
    setPendingFocusEventId(id);
  }, []);

  const loadEvents = useCallback(
    async (nextFilters: EventsFilters, nextBounds: EventsBounds | null) => {
      const requestParams = {
        ...nextFilters,
        ...(nextBounds ?? {}),
      };
      const fetchKey = makeCacheKey(requestParams);
      if (lastFetchKeyRef.current === fetchKey) {
        return;
      }

      lastFetchKeyRef.current = fetchKey;
      abortRef.current?.abort();

      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setLoadError(null);

      try {
        const data = await fetchEvents(requestParams, controller.signal);
        setEvents((prev) => {
          if (sameEventIdsInOrder(prev, data)) {
            return prev;
          }

          return data;
        });
        setSelectedEventId((prev) => {
          if (!prev) {
            return null;
          }

          const stillExists = data.some((event) => event.id === prev);
          return stillExists ? prev : null;
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        lastFetchKeyRef.current = null;
        setLoadError("Failed to load events.");
      } finally {
        if (abortRef.current === controller) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  const debouncedLoadEvents = useMemo(
    () =>
      debounce((nextFilters: EventsFilters, nextBounds: EventsBounds | null) => {
        void loadEvents(nextFilters, nextBounds);
      }, 300),
    [loadEvents],
  );

  useEffect(() => {
    debouncedLoadEvents(filters, bounds);
    return () => {
      abortRef.current?.abort();
    };
  }, [bounds, debouncedLoadEvents, filters]);

  return (
    <main className="app-shell page-stack">
      <section className="ui-card-static rounded-2xl bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-8 text-center md:px-10 md:py-12">
        <h1 className="page-title md:text-4xl">
          Find and organize activities around you
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base text-gray-600 md:text-lg">
          Discover events, meet people, and create your own activities.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          {isAuthenticated ? (
            <Link
              className="btn-primary px-6 py-3 text-sm font-semibold"
              href="/create"
            >
              Create activity
            </Link>
          ) : (
            <button
              className="btn-primary px-6 py-3 text-sm font-semibold"
              onClick={() => signIn("google", { callbackUrl: "/create" })}
              type="button"
            >
              Create activity
            </button>
          )}
          <p className="text-sm text-gray-500">
            Click on the map to explore events near you.
          </p>
        </div>
      </section>

      {!isAuthenticated ? (
        <p className="body-muted">
          Sign in to create events. Viewing events is public.
        </p>
      ) : null}

      {loadError ? <p className="body-muted text-red-600">{loadError}</p> : null}

      <section className="grid gap-4 md:grid-cols-[320px_minmax(0,1fr)]">
        <div className="h-[70vh] min-h-[440px]">
          <EventsPanel
            events={events}
            filters={filters}
            onFiltersChange={(next) =>
              setFilters({
                ...next,
                category: next.category as EventCategory | undefined,
              })
            }
            onSelect={handleSelectEvent}
            selectedEventId={selectedEventId}
          />
        </div>

        <div className="space-y-3">
          <div>
            <h2 className="section-title">Explore activities near you</h2>
            <p className="body-muted mt-1">
              Discover sports, meetups, study groups and community events.
            </p>
          </div>
          <div className="relative h-[70vh] min-h-[440px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
          {isLoading ? (
            <div className="absolute left-3 top-3 z-[1000] rounded-md bg-white/95 px-3 py-1 text-xs font-medium shadow">
              Loading events...
            </div>
          ) : null}

          <MapEventsClient
            events={events}
            initialCenter={[32.0853, 34.7818]}
            initialZoom={13}
            onBoundsChange={handleBoundsChange}
            onDeleted={(id) => {
              setEvents((prev) => prev.filter((event) => event.id !== id));
              setPendingFocusEventId((prev) => (prev === id ? null : prev));
              setSelectedEventId((prev) => (prev === id ? null : prev));
            }}
            onFocusHandled={() => setPendingFocusEventId(null)}
            onSelect={handleSelectEvent}
            pendingFocusEventId={pendingFocusEventId}
            selectedEventId={selectedEventId}
          />
          </div>
        </div>
      </section>
    </main>
  );
}
