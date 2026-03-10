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

export default function MyEventsPage() {
  const { status, isAuthenticated } = useSessionClient();
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadEvents = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/my-events", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load events");
      }

      const data = (await response.json()) as Event[];
      setEvents(Array.isArray(data) ? data : []);
    } catch {
      setError("Failed to load your events.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void loadEvents();
  }, [isAuthenticated]);

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/events/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setError("Failed to delete event.");
      return;
    }

    await loadEvents();
  };

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
        <h1 className="page-title">My Events</h1>
        <p className="body-muted">Please sign in to view your events.</p>
        <button
          className="btn-primary"
          onClick={() => signIn("google", { callbackUrl: "/my-events" })}
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
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">My Events</h1>
        <p className="mt-2 text-gray-600">
          Manage the activities you created, edit details, and review join requests.
        </p>
      </header>

      {error ? <p className="body-muted text-red-600">{error}</p> : null}
      {loading ? <p className="body-muted">Loading...</p> : null}

      <div className="space-y-4">
        {events.map((event) => {
          const categoryMeta = getCategoryDisplay(
            event.category,
            event.customCategoryTitle,
          );
          const isPastEvent = Boolean(
            event.dateISO &&
              new Date(event.dateISO).getTime() <
                Date.now() - 24 * 60 * 60 * 1000,
          );

          return (
            <Card className="hover:shadow-md" key={event.id}>
              <CardContent className="p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 space-y-3">
                  <div>
                    <Badge className="mb-1" variant="secondary">
                      {categoryMeta.emoji} {categoryMeta.label}
                    </Badge>
                    {isPastEvent ? (
                      <Badge className="ml-2 mb-1" variant="outline">
                        Past event
                      </Badge>
                    ) : null}
                    <Link
                      className="mt-1 block text-xl font-semibold text-gray-900 transition hover:text-indigo-700"
                      href={`/events/${event.id}`}
                    >
                      {event.title}
                    </Link>
                  </div>

                  <div className="space-y-1 text-sm text-gray-600">
                    <p>
                      📍{" "}
                      {event.city
                        ? event.address
                          ? `${event.city} · ${event.address}`
                          : event.city
                        : event.address || "No specific place"}
                    </p>
                    <p>
                      🕒{" "}
                      {event.dateISO
                        ? new Date(event.dateISO).toLocaleString()
                        : "Not scheduled yet"}
                    </p>
                    <p>🗓 Created {new Date(event.createdAtISO).toLocaleString()}</p>
                    <p>
                      ✅{" "}
                      {event.autoApprove
                        ? "Anyone can join"
                        : "Request to join (approval required)"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:max-w-[360px] md:justify-end">
                  <Button asChild size="sm">
                    <Link href={`/events/${event.id}`}>View details</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href={`/edit/${event.id}`}>Edit</Link>
                  </Button>
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/create?duplicate=${event.id}`}>Duplicate</Link>
                  </Button>
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/events/${event.id}/manage`}>Manage Requests</Link>
                  </Button>
                  <Button
                    onClick={() => {
                      void handleDelete(event.id);
                    }}
                    size="sm"
                    type="button"
                    variant="danger-ghost"
                  >
                    Delete
                  </Button>
                </div>
              </div>
              </CardContent>
            </Card>
          );
        })}

        {!loading && events.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
            You have no events yet.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  );
}
