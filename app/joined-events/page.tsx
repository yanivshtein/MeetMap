"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { getCategoryDisplay } from "@/src/lib/eventCategories";
import { useSessionClient } from "@/src/lib/sessionClient";
import type { Event } from "@/src/types/event";

type JoinedEvent = Event & {
  joinedAtISO: string;
};

export default function JoinedEventsPage() {
  const { status, isAuthenticated } = useSessionClient();
  const [events, setEvents] = useState<JoinedEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadJoinedEvents = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/joined-events", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load joined events");
      }

      const data = (await response.json()) as JoinedEvent[];
      setEvents(Array.isArray(data) ? data : []);
    } catch {
      setError("Failed to load joined events.");
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveEvent = async (id: string) => {
    setError(null);
    const response = await fetch(`/api/events/${id}/attendance`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setError("Failed to leave event.");
      return;
    }

    setEvents((prev) => prev.filter((event) => event.id !== id));
  };

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void loadJoinedEvents();
  }, [isAuthenticated]);

  if (status === "loading") {
    return (
      <main className="app-shell">
        <p className="body-muted">Checking authentication...</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="app-shell page-stack">
        <h1 className="page-title">Joined Events</h1>
        <p className="body-muted">Please sign in to view joined events.</p>
        <button
          className="btn-primary"
          onClick={() => signIn("google", { callbackUrl: "/joined-events" })}
          type="button"
        >
          Sign in with Google
        </button>
      </main>
    );
  }

  return (
    <main className="app-shell page-stack">
      <header>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          Joined Events
        </h1>
        <p className="mt-2 text-gray-600">Activities you have joined.</p>
      </header>

      {error ? <p className="body-muted text-red-600">{error}</p> : null}
      {loading ? <p className="body-muted">Loading...</p> : null}

      <section className="space-y-4">
        {events.map((event) => {
          const categoryMeta = getCategoryDisplay(
            event.category,
            event.customCategoryTitle,
          );
          const attendeeCount = event.attendanceCount ?? event._count?.attendances;
          const locationText = event.city
            ? event.address
              ? `${event.city} · ${event.address}`
              : event.city
            : event.address || "No specific place";

          return (
            <Card className="hover:shadow-md" key={event.id}>
              <CardContent className="p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 space-y-3">
                  <div>
                    <Badge className="mb-1" variant="secondary">
                      {categoryMeta.emoji} {categoryMeta.label}
                    </Badge>
                    <p className="text-xl font-semibold text-gray-900">
                      {event.title}
                    </p>
                  </div>

                  <div className="space-y-1 text-sm text-gray-600">
                    <p>📍 {locationText}</p>
                    <p>
                      🕒{" "}
                      {event.dateISO
                        ? new Date(event.dateISO).toLocaleString()
                        : "Date not scheduled"}
                    </p>
                    <p>
                      👤 Organizer:{" "}
                      {event.user?.name?.trim() || "Organizer not available"}
                    </p>
                    {typeof attendeeCount === "number" ? (
                      <p>👥 {attendeeCount} attending</p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:max-w-[360px] md:justify-end">
                  <Button asChild size="sm">
                    <Link href={`/events/${event.id}`}>View details</Link>
                  </Button>
                  <Button asChild size="sm" variant="secondary">
                    <Link href="/">Open on map</Link>
                  </Button>
                  <Button
                    onClick={() => {
                      void handleLeaveEvent(event.id);
                    }}
                    size="sm"
                    type="button"
                    variant="danger-ghost"
                  >
                    Leave event
                  </Button>
                </div>
              </div>
              </CardContent>
            </Card>
          );
        })}

        {!loading && events.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
            <p className="text-gray-600">You haven&apos;t joined any activities yet.</p>
            <div className="mt-4">
              <Button asChild>
                <Link href="/">Explore activities</Link>
              </Button>
            </div>
            </CardContent>
          </Card>
        ) : null}
      </section>
    </main>
  );
}
