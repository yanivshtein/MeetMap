"use client";

import dynamic from "next/dynamic";
import { signIn } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import CityAutocomplete from "@/src/components/CityAutocomplete";
import { isValidCity } from "@/src/lib/cities";
import {
  combineDateAndTimeToISO,
  splitISOToDateAndTime,
  TIME_OPTIONS,
} from "@/src/lib/dateTimeSlots";
import {
  CONTACT_METHOD_OPTIONS,
  CONTACT_VISIBILITY_OPTIONS,
  type ContactMethod,
  type ContactVisibility,
} from "@/src/lib/contactMethods";
import {
  CATEGORY_GROUPS,
  type EventCategory,
} from "@/src/lib/eventCategories";
import { useSessionClient } from "@/src/lib/sessionClient";
import type { Event } from "@/src/types/event";

type LatLng = { lat: number; lng: number };
type LocationStatus = "idle" | "loading" | "success" | "error";

const LocationPickerMap = dynamic(
  () => import("@/src/components/LocationPickerMap"),
  {
    ssr: false,
  },
);

export default function EditEventPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { status, isAuthenticated, userId } = useSessionClient();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [locationError, setLocationError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [city, setCity] = useState("");
  const [citySelected, setCitySelected] = useState(false);
  const [category, setCategory] = useState<EventCategory>("COFFEE");
  const [customCategoryTitle, setCustomCategoryTitle] = useState("");
  const [address, setAddress] = useState("");
  const [datePart, setDatePart] = useState("");
  const [timePart, setTimePart] = useState("");
  const [description, setDescription] = useState("");
  const [contactMethod, setContactMethod] = useState<ContactMethod>("NONE");
  const [contactVisibility, setContactVisibility] =
    useState<ContactVisibility>("SIGNED_IN_ONLY");
  const [whatsappInviteUrl, setWhatsappInviteUrl] = useState("");
  const [pickedLatLng, setPickedLatLng] = useState<LatLng | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeMessage, setGeocodeMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
          throw new Error("Failed to load event");
        }

        const found = (await response.json()) as Event;

        if (!isMounted) {
          return;
        }

        setEvent(found);
        setTitle(found.title);
        setCity(found.city ?? "");
        setCitySelected(found.city ? isValidCity(found.city) : false);
        setCategory(found.category);
        setCustomCategoryTitle(found.customCategoryTitle ?? "");
        setAddress(found.address ?? "");
        const { datePart: nextDate, timePart: nextTime } = splitISOToDateAndTime(
          found.dateISO,
        );
        setDatePart(nextDate);
        setTimePart(nextTime);
        setDescription(found.description ?? "");
        setContactMethod(found.contactMethod ?? "NONE");
        setContactVisibility(found.contactVisibility ?? "SIGNED_IN_ONLY");
        setWhatsappInviteUrl(found.whatsappInviteUrl ?? "");
        setPickedLatLng({ lat: found.lat, lng: found.lng });
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

  const locationStatusText =
    locationStatus === "loading"
      ? "Getting your location..."
      : locationStatus === "success"
        ? "Centered on your location."
        : locationStatus === "error"
          ? `${locationError ?? "Could not get your location."} You can still choose a location by clicking the map.`
          : "Click the map to choose event location.";

  const handleSubmit = async (formEvent: React.FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();

    if (!pickedLatLng) {
      setSubmitError("Please select a location on the map.");
      return;
    }

    if (title.trim().length < 2) {
      setSubmitError("Title must be at least 2 characters.");
      return;
    }
    if (city.trim().length < 2) {
      setSubmitError("City is required.");
      return;
    }
    if (!citySelected || !isValidCity(city)) {
      setSubmitError("Please choose a city from the list.");
      return;
    }
    if (category === "OTHER" && customCategoryTitle.trim().length < 2) {
      setSubmitError("Please enter a title for the Other category.");
      return;
    }
    if (
      contactMethod === "WHATSAPP_GROUP" &&
      !(
        whatsappInviteUrl.trim().startsWith("https://chat.whatsapp.com/") ||
        whatsappInviteUrl.trim().startsWith("https://wa.me/")
      )
    ) {
      setSubmitError(
        "WhatsApp invite URL must start with https://chat.whatsapp.com/ or https://wa.me/",
      );
      return;
    }

    if ((datePart && !timePart) || (!datePart && timePart)) {
      setSubmitError("Choose both date and time.");
      return;
    }

    const dateISO = combineDateAndTimeToISO(datePart, timePart);

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(`/api/events/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          city: city.trim(),
          category,
          customCategoryTitle:
            category === "OTHER" ? customCategoryTitle.trim() : undefined,
          address: address.trim() || undefined,
          description: description.trim() || undefined,
          dateISO,
          contactMethod,
          contactVisibility,
          whatsappInviteUrl:
            contactMethod === "WHATSAPP_GROUP"
              ? whatsappInviteUrl.trim()
              : undefined,
          lat: pickedLatLng.lat,
          lng: pickedLatLng.lng,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setSubmitError(data?.error ?? "Failed to update event.");
        return;
      }

      router.push("/my-events");
    } catch {
      setSubmitError("Failed to update event.");
    } finally {
      setSubmitting(false);
    }
  };

  const geocodeAddress = async () => {
    const trimmed = address.trim();
    if (trimmed.length < 3) {
      setGeocodeMessage(null);
      return;
    }

    setIsGeocoding(true);
    setGeocodeMessage(null);

    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`, {
        method: "GET",
      });

      if (!response.ok) {
        setGeocodeMessage("Address not found. Try a more specific address.");
        return;
      }

      const data = (await response.json()) as {
        lat?: number;
        lng?: number;
        displayName?: string;
      };

      if (
        typeof data.lat !== "number" ||
        typeof data.lng !== "number" ||
        !Number.isFinite(data.lat) ||
        !Number.isFinite(data.lng)
      ) {
        setGeocodeMessage("Address not found. Try a more specific address.");
        return;
      }

      setPickedLatLng({ lat: data.lat, lng: data.lng });
      if (typeof data.displayName === "string" && data.displayName.trim()) {
        setAddress(data.displayName.trim().slice(0, 120));
      }
      setGeocodeMessage("Location found on map");
    } catch {
      setGeocodeMessage("Address not found. Try a more specific address.");
    } finally {
      setIsGeocoding(false);
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
        <h1 className="page-title">Edit Event</h1>
        <p className="body-muted">Please sign in to edit events.</p>
        <button
          className="btn-primary"
          onClick={() => signIn("google", { callbackUrl: `/edit/${params.id}` })}
          type="button"
        >
          Sign in with Google
        </button>
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

  return (
    <main className="app-shell page-stack">
      <h1 className="page-title">Edit Event</h1>

      <section className="grid gap-6 md:grid-cols-2">
        <div>
          <form className="ui-card-static space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="label-base" htmlFor="title">
                Title
              </label>
              <input
                className="input-base"
                id="title"
                onChange={(e) => setTitle(e.target.value)}
                type="text"
                value={title}
              />
            </div>

            <div>
              <CityAutocomplete
                label="City"
                onChange={setCity}
                onSelectionChange={setCitySelected}
                required
                selected={citySelected}
                value={city}
              />
            </div>

            <div>
              <label className="label-base" htmlFor="category">
                Category
              </label>
              <select
                className="input-base"
                id="category"
                onChange={(e) => {
                  const nextCategory = e.target.value as EventCategory;
                  setCategory(nextCategory);
                  if (nextCategory !== "OTHER") {
                    setCustomCategoryTitle("");
                  }
                }}
                value={category}
              >
                {CATEGORY_GROUPS.map((group) => (
                  <optgroup key={group.group} label={group.group}>
                    {group.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.emoji} {option.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {category === "OTHER" ? (
                <div className="mt-2">
                  <input
                    className="input-base"
                    maxLength={60}
                    onChange={(e) => setCustomCategoryTitle(e.target.value)}
                    placeholder="Enter category title"
                    type="text"
                    value={customCategoryTitle}
                  />
                </div>
              ) : null}
            </div>

            <div>
              <label className="label-base" htmlFor="address">
                Address
              </label>
              <input
                className="input-base"
                id="address"
                maxLength={120}
                onBlur={() => {
                  void geocodeAddress();
                }}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setGeocodeMessage(null);
                }}
                type="text"
                value={address}
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  className="btn-secondary !rounded-lg !px-3 !py-1.5"
                  disabled={isGeocoding}
                  onClick={() => {
                    void geocodeAddress();
                  }}
                  type="button"
                >
                  Find Address
                </button>
                {isGeocoding ? (
                  <span className="text-sm text-gray-600">Finding...</span>
                ) : null}
              </div>
              {geocodeMessage ? (
                <p
                  className={
                    geocodeMessage === "Location found on map"
                      ? "mt-1 text-sm text-green-700"
                      : "mt-1 text-sm text-red-600"
                  }
                >
                  {geocodeMessage}
                </p>
              ) : null}
            </div>

            <div>
              <label className="label-base" htmlFor="contactMethod">
                Contact method
              </label>
              <select
                className="input-base"
                id="contactMethod"
                onChange={(e) => {
                  const value = e.target.value as ContactMethod;
                  setContactMethod(value);
                  if (value !== "WHATSAPP_GROUP") {
                    setWhatsappInviteUrl("");
                  }
                }}
                value={contactMethod}
              >
                {CONTACT_METHOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {contactMethod === "WHATSAPP_GROUP" ? (
                <div className="mt-2">
                  <label className="label-base" htmlFor="whatsappInviteUrl">
                    WhatsApp group invite link
                  </label>
                  <input
                    className="input-base"
                    id="whatsappInviteUrl"
                    onChange={(e) => setWhatsappInviteUrl(e.target.value)}
                    placeholder="https://chat.whatsapp.com/..."
                    type="url"
                    value={whatsappInviteUrl}
                  />
                </div>
              ) : null}
              {contactMethod === "ORGANIZER_PHONE" ? (
                <p className="mt-2 text-xs text-gray-600">
                  Make sure you added your phone in Settings.
                </p>
              ) : null}
            </div>

            <div>
              <label className="label-base" htmlFor="contactVisibility">
                Contact visibility
              </label>
              <select
                className="input-base"
                id="contactVisibility"
                onChange={(e) =>
                  setContactVisibility(e.target.value as ContactVisibility)
                }
                value={contactVisibility}
              >
                {CONTACT_VISIBILITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-sm font-medium">When</p>
              <p className="mt-1 text-xs text-gray-600">Choose a date and a start time.</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="label-base" htmlFor="date">
                    Date
                  </label>
                  <input
                    className="input-base"
                    id="date"
                    onChange={(e) => setDatePart(e.target.value)}
                    type="date"
                    value={datePart}
                  />
                </div>
                <div>
                  <label className="label-base" htmlFor="time">
                    Time
                  </label>
                  <select
                    className="input-base"
                    id="time"
                    onChange={(e) => setTimePart(e.target.value)}
                    value={timePart}
                  >
                    <option value="">Select time</option>
                    {TIME_OPTIONS.map((timeValue) => (
                      <option key={timeValue} value={timeValue}>
                        {timeValue}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Time can be selected only in 15-minute increments.
              </p>
            </div>

            <div>
              <label className="label-base" htmlFor="description">
                Description
              </label>
              <textarea
                className="input-base"
                id="description"
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                value={description}
              />
            </div>

            <p className="text-sm text-gray-600">
              Selected location: {pickedLatLng ? `${pickedLatLng.lat.toFixed(5)}, ${pickedLatLng.lng.toFixed(5)}` : "None"}
            </p>

            <button
              className="btn-primary"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>

            {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
          </form>
        </div>

        <div className="ui-card-static p-3">
          <p className="body-muted">{locationStatusText}</p>
          <div className="mt-3 h-[360px] overflow-hidden rounded-lg border border-gray-200">
            <LocationPickerMap
              center={[32.0853, 34.7818]}
              onLocationStatusChange={({ status, errorMessage }) => {
                setLocationStatus(status);
                setLocationError(errorMessage);
              }}
              onChange={setPickedLatLng}
              value={pickedLatLng}
              zoom={13}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
