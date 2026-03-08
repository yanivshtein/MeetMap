"use client";

import { signIn } from "next-auth/react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSessionClient } from "@/src/lib/sessionClient";

type JoinRequestItem = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
};

export default function ManageJoinRequestsPage() {
  const params = useParams<{ id: string }>();
  const eventId = typeof params?.id === "string" ? params.id : "";
  const { status, isAuthenticated } = useSessionClient();

  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<JoinRequestItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notAllowed, setNotAllowed] = useState(false);

  const loadRequests = async () => {
    if (!eventId) {
      return;
    }

    setLoading(true);
    setError(null);
    setNotAllowed(false);

    try {
      const response = await fetch(`/api/events/${eventId}/join-requests`, {
        method: "GET",
        cache: "no-store",
      });

      if (response.status === 403) {
        setNotAllowed(true);
        setRequests([]);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to load requests.");
      }

      const data = (await response.json()) as JoinRequestItem[];
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      setError("Failed to load join requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void loadRequests();
  }, [eventId, isAuthenticated]);

  const mutateRequest = async (requestId: string, action: "approve" | "reject") => {
    const response = await fetch(
      `/api/events/${eventId}/join-requests/${requestId}/${action}`,
      {
        method: "POST",
      },
    );

    if (!response.ok) {
      setError(`Failed to ${action} request.`);
      return;
    }

    await loadRequests();
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
        <h1 className="page-title">Manage Join Requests</h1>
        <p className="body-muted">Please sign in to manage requests.</p>
        <button
          className="btn-primary"
          onClick={() => signIn("google", { callbackUrl: `/events/${eventId}/manage` })}
          type="button"
        >
          Sign in with Google
        </button>
      </main>
    );
  }

  if (notAllowed) {
    return (
      <main className="app-shell page-stack max-w-4xl">
        <h1 className="page-title">Manage Join Requests</h1>
        <p className="mt-3 text-red-600">Not allowed.</p>
      </main>
    );
  }

  return (
    <main className="app-shell page-stack max-w-4xl">
      <h1 className="page-title">Manage Join Requests</h1>
      {loading ? <p className="body-muted">Loading...</p> : null}
      {error ? <p className="body-muted text-red-600">{error}</p> : null}

      <div className="ui-card-static">
        {requests.length === 0 && !loading ? (
          <p className="body-muted">No join requests.</p>
        ) : (
          <ul className="space-y-3">
            {requests.map((request) => (
              <li
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
                key={request.id}
              >
                <div className="flex items-center gap-2">
                  {request.user.image ? (
                    <img
                      alt={request.user.name ?? "Requester"}
                      className="h-8 w-8 rounded-full object-cover"
                      src={request.user.image}
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm">
                      {(request.user.name?.[0] ?? "?").toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {request.user.name?.trim() || "Anonymous user"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {request.status} • {new Date(request.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {request.status === "PENDING" ? (
                  <div className="flex items-center gap-2">
                    <button
                      className="btn-primary !bg-green-600"
                      onClick={() => {
                        void mutateRequest(request.id, "approve");
                      }}
                      type="button"
                    >
                      Approve
                    </button>
                    <button
                      className="btn-primary !bg-red-600"
                      onClick={() => {
                        void mutateRequest(request.id, "reject");
                      }}
                      type="button"
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
