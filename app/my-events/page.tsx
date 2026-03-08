"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
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
      <h1 className="page-title">My Events</h1>

      {error ? <p className="body-muted text-red-600">{error}</p> : null}
      {loading ? <p className="body-muted">Loading...</p> : null}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Address</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr className="border-t" key={event.id}>
                <td className="px-4 py-3">
                  <Link className="text-indigo-700 underline" href={`/events/${event.id}`}>
                    {event.title}
                  </Link>
                </td>
                <td className="px-4 py-3">{event.address ?? "-"}</td>
                <td className="px-4 py-3">
                  {event.dateISO ? new Date(event.dateISO).toLocaleString() : "-"}
                </td>
                <td className="px-4 py-3">{new Date(event.createdAtISO).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      className="btn-primary !rounded-lg !px-3 !py-1.5"
                      href={`/edit/${event.id}`}
                    >
                      Edit
                    </Link>
                    <Link
                      className="btn-secondary !rounded-lg !px-3 !py-1.5"
                      href={`/create?duplicate=${event.id}`}
                    >
                      Duplicate event
                    </Link>
                    <Link
                      className="btn-primary !rounded-lg !bg-blue-700 !px-3 !py-1.5"
                      href={`/events/${event.id}/manage`}
                    >
                      Manage Requests
                    </Link>
                    <button
                      className="btn-primary !rounded-lg !bg-red-600 !px-3 !py-1.5"
                      onClick={() => {
                        void handleDelete(event.id);
                      }}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && events.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-gray-500" colSpan={5}>
                  You have no events yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
