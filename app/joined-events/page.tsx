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
      <main className="mx-auto max-w-6xl p-6">
        <p className="text-sm text-gray-600">Checking authentication...</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <h1 className="text-2xl font-semibold">Joined Events</h1>
        <p className="mt-3 text-gray-700">Please sign in to view joined events.</p>
        <button
          className="mt-4 rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
          onClick={() => signIn("google", { callbackUrl: "/joined-events" })}
          type="button"
        >
          Sign in with Google
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-semibold">Joined Events</h1>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="mt-3 text-sm text-gray-600">Loading...</p> : null}

      <div className="mt-4 overflow-x-auto rounded-xl border">
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
                  <Link className="text-blue-700 underline" href={`/events/${event.id}`}>
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
