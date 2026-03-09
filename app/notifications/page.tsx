"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { useSessionClient } from "@/src/lib/sessionClient";

type NotificationItem = {
  id: string;
  type: string;
  eventId: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
};

function getNotificationIcon(type: string) {
  if (type.startsWith("JOIN_")) {
    return "👤";
  }
  if (type === "NEW_MATCHING_EVENT") {
    return "🔔";
  }
  return "🔔";
}

export default function NotificationsPage() {
  const { status, isAuthenticated } = useSessionClient();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emitUnreadCount = (count: number) => {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(
      new CustomEvent("notifications:updated", {
        detail: { unreadCount: count },
      }),
    );
  };

  const getApiErrorMessage = async (
    response: Response,
    fallback: string,
  ): Promise<string> => {
    const rawText = await response.text().catch(() => "");

    if (rawText) {
      try {
        const parsed = JSON.parse(rawText) as { error?: string };
        if (parsed.error) {
          return parsed.error;
        }
      } catch {
        // ignore JSON parse errors
      }
    }

    if (response.status === 401) {
      return "Please sign in to view notifications.";
    }

    if (response.status >= 500) {
      return `Server error (${response.status}).`;
    }

    return rawText.trim() || fallback;
  };

  const loadNotifications = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/notifications", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(response, "Failed to load notifications."),
        );
      }

      const data = (await response.json()) as NotificationItem[];
      const next = Array.isArray(data) ? data : [];
      setNotifications(next);
      emitUnreadCount(next.filter((item) => !item.isRead).length);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load notifications.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void loadNotifications();
  }, [isAuthenticated]);

  const markAllRead = async () => {
    const response = await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ all: true }),
    });

    if (!response.ok) {
      setError(
        await getApiErrorMessage(
          response,
          "Failed to mark notifications as read.",
        ),
      );
      return;
    }

    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    emitUnreadCount(0);
  };

  const markSingleRead = async (id: string) => {
    await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids: [id] }),
    });
  };

  if (status === "loading") {
    return (
      <main className="app-shell max-w-4xl">
        <p className="body-muted">Checking authentication...</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="app-shell page-stack max-w-4xl">
        <h1 className="page-title">Notifications</h1>
        <p className="body-muted">Please sign in to view notifications.</p>
        <button
          className="btn-primary"
          onClick={() => signIn("google", { callbackUrl: "/notifications" })}
          type="button"
        >
          Sign in with Google
        </button>
      </main>
    );
  }

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  return (
    <main className="app-shell page-stack max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Notifications
          </h1>
          <p className="mt-2 text-gray-600">
            Stay updated on activity related to your events.
          </p>
        </div>
        <button
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          onClick={() => {
            void markAllRead();
          }}
          type="button"
        >
          Mark all read
        </button>
      </div>

      <p className="body-muted">
        {unreadCount} unread {unreadCount === 1 ? "notification" : "notifications"}.
      </p>

      {loading ? <p className="body-muted">Loading...</p> : null}
      {error ? <p className="body-muted text-red-600">{error}</p> : null}

      <div className="space-y-4">
        {notifications.map((notification) => (
          <article
            className={[
              "rounded-xl border p-4 shadow-sm transition hover:shadow-md",
              notification.isRead
                ? "border-gray-200 bg-white"
                : "border-indigo-200 bg-indigo-50/40",
            ].join(" ")}
            key={notification.id}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-lg">{getNotificationIcon(notification.type)}</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{notification.message}</p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  <span>{new Date(notification.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="mt-3">
              {notification.eventId ? (
                <Link
                  className="font-medium text-indigo-600 transition hover:underline"
                  href={`/events/${notification.eventId}`}
                  onClick={() => {
                    if (notification.isRead) {
                      return;
                    }

                    const next = notifications.map((item) =>
                      item.id === notification.id
                        ? { ...item, isRead: true }
                        : item,
                    );
                    setNotifications(next);
                    emitUnreadCount(next.filter((item) => !item.isRead).length);
                    void markSingleRead(notification.id);
                  }}
                >
                  Open event
                </Link>
              ) : null}
            </div>
          </article>
        ))}

        {!loading && notifications.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
            <p className="text-lg font-semibold text-gray-900">You&apos;re all caught up 🎉</p>
            <p className="mt-1 text-sm text-gray-500">No new notifications.</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
