"use client";

import dynamic from "next/dynamic";
import { signIn } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import CreateEventForm from "@/src/components/CreateEventForm";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import {
  type ContactMethod,
  type ContactVisibility,
} from "@/src/lib/contactMethods";
import { isValidCategory, type EventCategory } from "@/src/lib/eventCategories";
import { useSessionClient } from "@/src/lib/sessionClient";
import type { Event } from "@/src/types/event";

type LatLng = { lat: number; lng: number };
type LocationStatus = "idle" | "loading" | "success" | "error";

const LocationPickerMap = dynamic(
  () => import("@/src/components/LocationPickerMap"),
  { ssr: false },
);

export default function EditEventPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { status, isAuthenticated, userId } = useSessionClient();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pickedLatLng, setPickedLatLng] = useState<LatLng | null>(null);
  const [cityQuery, setCityQuery] = useState("");
  const [mapFocusLatLng, setMapFocusLatLng] = useState<LatLng | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [preferredQuickCategories, setPreferredQuickCategories] = useState<
    EventCategory[]
  >([]);
  const [initialValues, setInitialValues] = useState<{
    category?: EventCategory;
    customName?: string;
    customCategoryTitle?: string;
    city?: string;
    address?: string;
    description?: string;
    contactMethod?: ContactMethod;
    contactVisibility?: ContactVisibility;
    whatsappInviteUrl?: string;
    autoApprove?: boolean;
    dateISO?: string;
  } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let cancelled = false;

    const loadProfileInterests = async () => {
      try {
        const response = await fetch("/api/me", {
          method: "GET",
          cache: "no-store",
        });
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          interestedCategories?: string[];
        };
        if (cancelled) {
          return;
        }

        const nextInterests = Array.isArray(data.interestedCategories)
          ? data.interestedCategories.filter((value): value is EventCategory =>
              isValidCategory(value),
            )
          : [];

        setPreferredQuickCategories(nextInterests);
      } catch {
        // Keep fallback defaults if profile load fails.
      }
    };

    void loadProfileInterests();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const query = cityQuery.trim();
    if (!query) {
      setMapFocusLatLng(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { lat?: number; lng?: number };
        if (
          cancelled ||
          typeof data.lat !== "number" ||
          typeof data.lng !== "number" ||
          !Number.isFinite(data.lat) ||
          !Number.isFinite(data.lng)
        ) {
          return;
        }

        setMapFocusLatLng({ lat: data.lat, lng: data.lng });
      } catch {
        // Ignore map recenter failures.
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [cityQuery]);

  useEffect(() => {
    if (!params.id) {
      return;
    }

    let isMounted = true;

    const loadEvent = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/events/${params.id}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load event.");
        }

        const found = (await response.json()) as Event;
        if (!isMounted) {
          return;
        }

        setEvent(found);
        setInitialValues({
          category: isValidCategory(found.category) ? found.category : "COFFEE",
          customName: found.title,
          customCategoryTitle: found.customCategoryTitle,
          city: found.city,
          address: found.address,
          description: found.description,
          contactMethod: found.contactMethod,
          contactVisibility: found.contactVisibility,
          whatsappInviteUrl: found.whatsappInviteUrl,
          autoApprove: found.autoApprove,
          dateISO: found.dateISO,
        });

        if (Number.isFinite(found.lat) && Number.isFinite(found.lng)) {
          const coords = { lat: found.lat, lng: found.lng };
          setPickedLatLng(coords);
          setMapFocusLatLng(coords);
        }
      } catch {
        if (isMounted) {
          setError("Failed to load event.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadEvent();
    return () => {
      isMounted = false;
    };
  }, [params.id]);

  const notAllowed = useMemo(() => {
    if (!event || !userId) {
      return false;
    }
    return event.userId !== userId;
  }, [event, userId]);

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
        <h1 className="page-title">Edit Event</h1>
        <p className="body-muted">Please sign in to edit events.</p>
        <Button
          onClick={() => signIn("google", { callbackUrl: `/edit/${params.id}` })}
          type="button"
        >
          Sign in with Google
        </Button>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="app-shell">
        <p className="body-muted">Loading event...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="app-shell">
        <p className="body-muted text-red-600">{error}</p>
      </main>
    );
  }

  if (notAllowed) {
    return (
      <main className="app-shell page-stack">
        <h1 className="page-title">Edit Event</h1>
        <p className="mt-3 text-red-600">Not allowed.</p>
      </main>
    );
  }

  const locationStatusText =
    locationStatus === "loading"
      ? "Getting your location..."
      : locationStatus === "error"
        ? `${locationError ?? "Could not get your location."} You can still choose a location by clicking the map.`
        : null;

  return (
    <main className="app-shell page-stack">
      <h1 className="page-title">Edit Event</h1>

      <section className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <CreateEventForm
            initialValues={initialValues}
            mapSlot={
              <Card className="md:hidden">
                <CardContent className="space-y-3 p-4">
                  <h2 className="section-title text-lg">Choose the location on the map</h2>
                  <p className="body-muted mt-1">
                    Click anywhere on the map to place the event location.
                  </p>
                  <div className="h-[300px] overflow-hidden rounded-xl border border-gray-200 shadow-sm sm:h-[320px]">
                    <LocationPickerMap
                      center={[32.0853, 34.7818]}
                      focusLatLng={mapFocusLatLng}
                      onLocationStatusChange={({ status, errorMessage }) => {
                        setLocationStatus(status);
                        setLocationError(errorMessage);
                      }}
                      onChange={setPickedLatLng}
                      value={pickedLatLng}
                      zoom={13}
                    />
                  </div>
                </CardContent>
              </Card>
            }
            onCancel={() => router.push("/my-events")}
            onCityChange={setCityQuery}
            onPickedLatLngChange={setPickedLatLng}
            onSubmitSuccess={() => router.push("/my-events")}
            pickedLatLng={pickedLatLng}
            preferredQuickCategories={preferredQuickCategories}
            submitButtonLabel="Save Changes"
            submitMode="edit"
            submitUrl={`/api/events/${params.id}`}
            useStickyActions
          />
        </div>

        <Card className="hidden space-y-3 md:sticky md:top-20 md:mb-12 md:block md:self-start">
          <CardContent className="space-y-3 p-5 md:pb-8">
            <h2 className="section-title text-lg">Choose the location on the map</h2>
            <p className="body-muted mt-1">
              You can set location by choosing a city, entering an address/place, or clicking directly on the map.
            </p>
            <div className="rounded-md border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
              Click anywhere on the map to place the event location.
            </div>
            {locationStatusText ? <p className="body-muted">{locationStatusText}</p> : null}
            <div className="h-[420px] overflow-hidden rounded-xl border border-gray-200 shadow-md">
              <LocationPickerMap
                center={[32.0853, 34.7818]}
                focusLatLng={mapFocusLatLng}
                onLocationStatusChange={({ status, errorMessage }) => {
                  setLocationStatus(status);
                  setLocationError(errorMessage);
                }}
                onChange={setPickedLatLng}
                value={pickedLatLng}
                zoom={13}
              />
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
