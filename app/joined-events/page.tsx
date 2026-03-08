"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
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
      <h1 className="page-title">Joined Events</h1>

      {error ? <p className="body-muted text-red-600">{error}</p> : null}
      {loading ? <p className="body-muted">Loading...</p> : null}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Address</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Joined</th>
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
                <td className="px-4 py-3">{new Date(event.joinedAtISO).toLocaleString()}</td>
              </tr>
            ))}
            {!loading && events.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-gray-500" colSpan={4}>
                  You have not joined any events yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
