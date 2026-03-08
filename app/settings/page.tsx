"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import CityAutocomplete from "@/src/components/CityAutocomplete";
import { isValidCity } from "@/src/lib/cities";
import {
  CATEGORY_GROUPS,
  type EventCategory,
  isValidCategory,
} from "@/src/lib/eventCategories";
import { useSessionClient } from "@/src/lib/sessionClient";

function isValidPhone(value: string) {
  return /^\+?[0-9]{7,20}$/.test(value);
}

export default function SettingsPage() {
  const { status, isAuthenticated } = useSessionClient();
  const [phone, setPhone] = useState("");
  const [homeTown, setHomeTown] = useState("");
  const [homeTownSelected, setHomeTownSelected] = useState(true);
  const [interestedCategories, setInterestedCategories] = useState<EventCategory[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      return "Please sign in to manage your profile.";
    }

    if (response.status >= 500) {
      return `Server error (${response.status}).`;
    }

    return rawText.trim() || fallback;
  };

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const loadProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/me", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            await getApiErrorMessage(response, "Failed to load profile."),
          );
        }

        const data = (await response.json()) as {
          phone?: string | null;
          homeTown?: string | null;
          interestedCategories?: string[];
        };
        setPhone(data.phone ?? "");
        const nextHomeTown = data.homeTown ?? "";
        setHomeTown(nextHomeTown);
        setHomeTownSelected(!nextHomeTown || isValidCity(nextHomeTown));
        setInterestedCategories(
          Array.isArray(data.interestedCategories)
            ? data.interestedCategories.filter((item): item is EventCategory =>
                isValidCategory(item),
              )
            : [],
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load profile.",
        );
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, [isAuthenticated]);

  const handleSave = async () => {
    const trimmed = phone.trim();
    setError(null);
    setSuccess(null);

    if (trimmed && !isValidPhone(trimmed)) {
      setError("Phone must contain only + and digits, length 7-20.");
      return;
    }
    if (homeTown.trim() && (!homeTownSelected || !isValidCity(homeTown))) {
      setError("Please choose a home town from the list.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        phone: trimmed || null,
        homeTown: homeTown.trim() || null,
        interestedCategories,
      };

      const response = await fetch("/api/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        setError(await getApiErrorMessage(response, "Failed to save profile."));
        return;
      }

      setSuccess("Saved.");
    } catch {
      setError("Failed to save profile.");
    } finally {
      setSaving(false);
    }
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
        <h1 className="page-title">Settings</h1>
        <p className="body-muted">Please sign in to manage your profile.</p>
        <button
          className="btn-primary"
          onClick={() => signIn("google", { callbackUrl: "/settings" })}
          type="button"
        >
          Sign in with Google
        </button>
      </main>
    );
  }

  return (
    <main className="app-shell page-stack max-w-3xl">
      <h1 className="page-title">Settings</h1>

      <div className="ui-card-static">
        {loading ? <p className="body-muted">Loading profile...</p> : null}

        <label className="label-base" htmlFor="phone">
          Phone (optional)
        </label>
        <input
          className="input-base"
          id="phone"
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+972501234567"
          type="tel"
          value={phone}
        />
        <p className="mt-1 text-xs text-gray-500">
          Used when an event contact method is Organizer phone.
        </p>

        <div className="mt-4">
          <CityAutocomplete
            label="Home town"
            onChange={setHomeTown}
            onSelectionChange={setHomeTownSelected}
            placeholder="Search city"
            selected={homeTownSelected}
            value={homeTown}
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Get notifications when new events matching your interests are created in your town.
        </p>

        <div className="mt-4">
          <p className="label-base mb-2">Interested categories</p>
          <div className="max-h-56 space-y-3 overflow-y-auto rounded-lg border border-gray-200 p-3">
            {CATEGORY_GROUPS.map((group) => (
              <div key={group.group}>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {group.group}
                </p>
                <div className="mt-1 space-y-1">
                  {group.options.map((option) => {
                    const checked = interestedCategories.includes(option.value);
                    return (
                      <label
                        className="flex items-center gap-2 text-sm"
                        key={option.value}
                      >
                        <input
                          checked={checked}
                          onChange={(e) => {
                            setInterestedCategories((prev) => {
                              if (e.target.checked) {
                                return [...prev, option.value];
                              }

                              return prev.filter((item) => item !== option.value);
                            });
                          }}
                          type="checkbox"
                        />
                        <span>
                          {option.emoji} {option.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          className="btn-primary mt-3"
          disabled={saving}
          onClick={() => {
            void handleSave();
          }}
          type="button"
        >
          {saving ? "Saving..." : "Save"}
        </button>

        {error ? <p className="body-muted mt-2 text-red-600">{error}</p> : null}
        {success ? <p className="body-muted mt-2 text-green-700">{success}</p> : null}
      </div>
    </main>
  );
}
