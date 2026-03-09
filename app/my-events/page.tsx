"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
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

          return (
            <article
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              key={event.id}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">
                      {categoryMeta.emoji} {categoryMeta.label}
                    </p>
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
                  <Link
                    className="btn-primary !rounded-lg !px-3 !py-2"
                    href={`/events/${event.id}`}
                  >
                    View details
                  </Link>
                  <Link
                    className="btn-primary !rounded-lg !px-3 !py-2"
                    href={`/edit/${event.id}`}
                  >
                    Edit
                  </Link>
                  <Link
                    className="btn-secondary !rounded-lg !px-3 !py-2"
                    href={`/create?duplicate=${event.id}`}
                  >
                    Duplicate
                  </Link>
                  <Link
                    className="btn-secondary !rounded-lg !px-3 !py-2"
                    href={`/events/${event.id}/manage`}
                  >
                    Manage Requests
                  </Link>
                  <button
                    className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 hover:text-red-700"
                    onClick={() => {
                      void handleDelete(event.id);
                    }}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          );
        })}

        {!loading && events.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500 shadow-sm">
            You have no events yet.
          </div>
        ) : null}
      </div>
    </main>
  );
}
