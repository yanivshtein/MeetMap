"use client";

import { signIn } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EventsPanel from "@/src/components/EventsPanel";
import MapEventsClient from "@/src/components/MapEventsClient";
import NewEventButton from "@/src/components/NewEventButton";
import type { MapBounds } from "@/src/components/MapEvents";
import { debounce } from "@/src/lib/debounce";
import { type EventCategory } from "@/src/lib/eventCategories";
import {
  fetchEvents,
  type EventsBounds,
  type EventsFilters,
} from "@/src/lib/eventsApi";
import { useSessionClient } from "@/src/lib/sessionClient";
import type { Event } from "@/src/types/event";

export default function HomePage() {
  const { isAuthenticated } = useSessionClient();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [filters, setFilters] = useState<EventsFilters>({});
  const [bounds, setBounds] = useState<EventsBounds | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleBoundsChange = useCallback((nextBounds: MapBounds) => {
    setBounds((prev) => {
      if (
        prev &&
        prev.north === nextBounds.north &&
        prev.south === nextBounds.south &&
        prev.east === nextBounds.east &&
        prev.west === nextBounds.west
      ) {
        return prev;
      }

      return nextBounds;
    });
  }, []);

  const loadEvents = useCallback(
    async (nextFilters: EventsFilters, nextBounds: EventsBounds | null) => {
      abortRef.current?.abort();

      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setLoadError(null);

      try {
        const data = await fetchEvents(
          {
            ...nextFilters,
            ...(nextBounds ?? {}),
          },
          controller.signal,
        );
        setEvents(data);
        setSelectedEventId((prev) => {
          if (!prev) {
            return data[0]?.id ?? null;
          }

          const stillExists = data.some((event) => event.id === prev);
          return stillExists ? prev : (data[0]?.id ?? null);
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

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
    <main className="mx-auto max-w-7xl p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Map</h1>
        {isAuthenticated ? (
          <NewEventButton />
        ) : (
          <button
            className="inline-flex rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
            onClick={() => signIn("google", { callbackUrl: "/create" })}
            type="button"
          >
            + New Event
          </button>
        )}
      </div>

      {!isAuthenticated ? (
        <p className="mt-2 text-sm text-gray-600">
          Sign in to create events. Viewing events is public.
        </p>
      ) : null}

      {loadError ? <p className="mt-2 text-sm text-red-600">{loadError}</p> : null}

      <section className="mt-4 grid gap-4 md:grid-cols-[360px_minmax(0,1fr)]">
        <div className="h-[420px] md:h-[calc(100vh-190px)]">
          <EventsPanel
            events={events}
            filters={filters}
            onFiltersChange={(next) =>
              setFilters({
                ...next,
                category: next.category as EventCategory | undefined,
              })
            }
            onSelect={(id) => setSelectedEventId(id)}
            selectedEventId={selectedEventId}
          />
        </div>

        <div className="relative h-[420px] overflow-hidden rounded-xl md:h-[calc(100vh-190px)]">
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
              setSelectedEventId((prev) => (prev === id ? null : prev));
            }}
            onSelect={(id) => setSelectedEventId(id)}
            selectedEventId={selectedEventId}
          />
        </div>
      </section>
    </main>
  );
}
