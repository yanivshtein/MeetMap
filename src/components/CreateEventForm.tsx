"use client";

import { useEffect, useState } from "react";
import CityAutocomplete from "@/src/components/CityAutocomplete";
import { isValidCity, normalizeCity } from "@/src/lib/cities";
import { combineDateAndTimeToISO, TIME_OPTIONS } from "@/src/lib/dateTimeSlots";
import {
  CONTACT_METHOD_OPTIONS,
  CONTACT_VISIBILITY_OPTIONS,
  type ContactMethod,
  type ContactVisibility,
} from "@/src/lib/contactMethods";
import {
  CATEGORY_GROUPS,
  getCategoryDisplay,
  type EventCategory,
} from "@/src/lib/eventCategories";

type LatLng = { lat: number; lng: number };

type FormErrors = {
  city?: string;
  customName?: string;
  customCategoryTitle?: string;
  address?: string;
  date?: string;
  contactMethod?: string;
  whatsappInviteUrl?: string;
  location?: string;
};

type CreateEventFormProps = {
  pickedLatLng: LatLng | null;
  onPickedLatLngChange: (value: LatLng) => void;
  onCityChange?: (city: string) => void;
  onSubmitSuccess: () => void;
  initialValues?: {
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
  } | null;
};

function validateCity(city: string): string | undefined {
  if (!city.trim()) {
    return undefined;
  }
  if (!isValidCity(city)) {
    return "Please choose a city from the list.";
  }
  return undefined;
}

function validateDateAndTime(datePart: string, timePart: string): string | undefined {
  if (!datePart && !timePart) {
    return undefined;
  }

  if (!datePart || !timePart) {
    return "Choose both date and time.";
  }

  const parsed = new Date(`${datePart}T${timePart}`);
  if (Number.isNaN(parsed.getTime())) {
    return "Date and time must be valid.";
  }

  return undefined;
}

function validateAddress(address: string): string | undefined {
  if (address.length > 120) {
    return "Address must be 120 characters or less.";
  }
  return undefined;
}

function validateLocation(pickedLatLng: LatLng | null): string | undefined {
  if (!pickedLatLng) {
    return undefined;
  }
  return undefined;
}

function validateWhatsappInviteUrl(
  contactMethod: ContactMethod,
  whatsappInviteUrl: string,
): string | undefined {
  if (contactMethod !== "WHATSAPP_GROUP") {
    return undefined;
  }

  const trimmed = whatsappInviteUrl.trim();
  if (!trimmed) {
    return "WhatsApp invite link is required.";
  }

  const isValidPrefix =
    trimmed.startsWith("https://chat.whatsapp.com/") ||
    trimmed.startsWith("https://wa.me/");

  if (!isValidPrefix) {
    return "Link must start with https://chat.whatsapp.com/ or https://wa.me/";
  }

  return undefined;
}

export default function CreateEventForm({
  pickedLatLng,
  onPickedLatLngChange,
  onCityChange,
  onSubmitSuccess,
  initialValues,
}: CreateEventFormProps) {
  const [customName, setCustomName] = useState("");
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
  const [autoApprove, setAutoApprove] = useState(false);
  const [whatsappInviteUrl, setWhatsappInviteUrl] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeMessage, setGeocodeMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const categoryDisplay = getCategoryDisplay(
    category,
    category === "OTHER" ? customCategoryTitle : undefined,
  );
  const generatedTitle = city.trim()
    ? `${categoryDisplay.label} in ${city.trim()}`
    : `${categoryDisplay.label} event`;
  const finalTitle = customName.trim() || generatedTitle;

  useEffect(() => {
    if (!initialValues) {
      return;
    }

    setCategory(initialValues.category ?? "COFFEE");
    setCustomName(initialValues.customName ?? "");
    setCustomCategoryTitle(initialValues.customCategoryTitle ?? "");
    setCity(initialValues.city ?? "");
    setCitySelected(Boolean(initialValues.city));
    setAddress(initialValues.address ?? "");
    setDescription(initialValues.description ?? "");
    setContactMethod(initialValues.contactMethod ?? "NONE");
    setContactVisibility(initialValues.contactVisibility ?? "SIGNED_IN_ONLY");
    setWhatsappInviteUrl(initialValues.whatsappInviteUrl ?? "");
    setAutoApprove(Boolean(initialValues.autoApprove));
    setDatePart("");
    setTimePart("");
    onCityChange?.(initialValues.city ?? "");
  }, [initialValues, onCityChange]);

  const getFriendlySubmitError = async (response: Response) => {
    const rawText = await response.text().catch(() => "");
    let parsed: { error?: string } | null = null;

    if (rawText) {
      try {
        parsed = JSON.parse(rawText) as { error?: string };
      } catch {
        parsed = null;
      }
    }

    if (parsed?.error) {
      return parsed.error;
    }

    if (response.status === 401) {
      return "You need to sign in before creating an event.";
    }

    if (response.status === 403) {
      return "You are not allowed to create this event.";
    }

    if (response.status === 400) {
      return "Some event details are invalid. Please review the form and try again.";
    }

    if (rawText.trim()) {
      return `Request failed (${response.status}): ${rawText.slice(0, 180)}`;
    }

    return `Request failed with status ${response.status}.`;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSubmitError(null);

    const nextErrors: FormErrors = {
      city:
        !citySelected && city.trim().length > 0
          ? "Please choose a city from the list."
          : validateCity(city),
      customName:
        customName.trim().length > 0 && customName.trim().length < 2
          ? "Custom name must be at least 2 characters."
          : undefined,
      customCategoryTitle:
        category === "OTHER" && customCategoryTitle.trim().length < 2
          ? "Please enter a title for the Other category."
          : undefined,
      address: validateAddress(address),
      date: validateDateAndTime(datePart, timePart),
      contactMethod: undefined,
      whatsappInviteUrl: validateWhatsappInviteUrl(
        contactMethod,
        whatsappInviteUrl,
      ),
      location: validateLocation(pickedLatLng),
    };

    const hasAnyLocationInput =
      Boolean(address.trim()) || Boolean(city.trim()) || Boolean(pickedLatLng);
    if (!hasAnyLocationInput) {
      nextErrors.location = "Add address, city, or choose a point on the map.";
    }

    const hasError = Boolean(
      nextErrors.city ||
        nextErrors.customName ||
        nextErrors.customCategoryTitle ||
        nextErrors.address ||
        nextErrors.date ||
        nextErrors.location,
    );
    if (hasError) {
      setErrors(nextErrors);
      return;
    }

    const dateISO = combineDateAndTimeToISO(datePart, timePart);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: finalTitle,
          city: city.trim(),
          category,
          customCategoryTitle:
            category === "OTHER" ? customCategoryTitle.trim() : undefined,
          address: address.trim() || undefined,
          description: description.trim() || undefined,
          dateISO,
          contactMethod,
          contactVisibility,
          autoApprove,
          whatsappInviteUrl:
            contactMethod === "WHATSAPP_GROUP"
              ? whatsappInviteUrl.trim()
              : undefined,
          lat: pickedLatLng?.lat,
          lng: pickedLatLng?.lng,
        }),
      });

      if (!response.ok) {
        setSubmitError(await getFriendlySubmitError(response));
        return;
      }

      setErrors({});
      onSubmitSuccess();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown network error";
      setSubmitError(
        `Could not reach the server. Check your connection and try again. (${message})`,
      );
    } finally {
      setIsSubmitting(false);
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

      onPickedLatLngChange({ lat: data.lat, lng: data.lng });
      if (typeof data.displayName === "string" && data.displayName.trim()) {
        const displayName = data.displayName.trim();
        setAddress(displayName.slice(0, 120));

        const segments = displayName
          .split(",")
          .map((segment) => segment.trim())
          .filter(Boolean);
        const extractedCityCandidate =
          segments.find((segment) => isValidCity(segment)) ?? null;
        const extractedCity = extractedCityCandidate
          ? normalizeCity(extractedCityCandidate)
          : null;
        if (extractedCity) {
          setCity(extractedCity);
          setCitySelected(true);
          onCityChange?.(extractedCity);
        }
      }
      setGeocodeMessage("Location found on map");
    } catch {
      setGeocodeMessage("Address not found. Try a more specific address.");
    } finally {
      setIsGeocoding(false);
    }
  };

  return (
    <form className="ui-card-static space-y-6" onSubmit={handleSubmit}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Preview
        </p>
        <div className="mt-1 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-sm font-medium">
            {categoryDisplay.emoji} {finalTitle}
          </p>
          <p className="mt-1 text-xs text-gray-600">
            City: {city.trim() || "Select a city"}
          </p>
          <p className="mt-1 text-xs text-gray-600">
            Date:{" "}
            {datePart && timePart
              ? new Date(`${datePart}T${timePart}`).toLocaleString()
              : "Not set yet"}
          </p>
        </div>
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
            {errors.customCategoryTitle ? (
              <p className="mt-1 text-sm text-red-600">{errors.customCategoryTitle}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div>
        <label className="label-base" htmlFor="customName">
          Custom name (optional)
        </label>
        <input
          className="input-base"
          id="customName"
          onChange={(e) => setCustomName(e.target.value)}
          placeholder="Leave empty to generate a name automatically"
          type="text"
          value={customName}
        />
        {errors.customName ? (
          <p className="mt-1 text-sm text-red-600">{errors.customName}</p>
        ) : null}
      </div>

      <div className="rounded-lg border border-gray-200 p-3">
        <p className="text-sm font-medium">Location</p>
        <p className="mt-1 text-xs text-gray-600">
          Use address, city, or map point. At least one is required.
        </p>
        <div className="mt-3">
          <CityAutocomplete
            label="City"
            onChange={(nextCity) => {
              setCity(nextCity);
              onCityChange?.(nextCity);
            }}
            onSelectionChange={setCitySelected}
            placeholder="Search city (optional)"
            selected={citySelected}
            value={city}
          />
          <p className="mt-1 text-xs text-gray-500">
            You can leave this empty if you choose the location on the map.
          </p>
          {errors.city ? <p className="mt-1 text-sm text-red-600">{errors.city}</p> : null}
        </div>
        <div className="mt-3">
          <label className="label-base" htmlFor="address">
            Address / place (optional)
          </label>
          <input
            className="input-base"
            id="address"
            maxLength={120}
            placeholder="Park, street, cafe, forest, trail..."
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
            {isGeocoding ? <span className="text-sm text-gray-600">Finding...</span> : null}
          </div>
          {errors.address ? (
            <p className="mt-1 text-sm text-red-600">{errors.address}</p>
          ) : null}
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
        {errors.date ? <p className="mt-1 text-sm text-red-600">{errors.date}</p> : null}
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

        {errors.whatsappInviteUrl ? (
          <p className="mt-1 text-sm text-red-600">{errors.whatsappInviteUrl}</p>
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
        <p className="text-sm font-medium">Join settings</p>
        <label className="label-base mt-2" htmlFor="joinPolicy">
          Join policy
        </label>
        <select
          className="input-base"
          id="joinPolicy"
          onChange={(event) => {
            setAutoApprove(event.target.value === "ANYONE");
          }}
          value={autoApprove ? "ANYONE" : "REQUEST"}
        >
          <option value="ANYONE">Anyone can join</option>
          <option value="REQUEST">
            Request to join (organizer approval required)
          </option>
        </select>
      </div>

      {errors.location ? (
        <p className="text-sm text-red-600">{errors.location}</p>
      ) : null}

      <button
        className="btn-primary"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Saving..." : "Save Event"}
      </button>
      {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
    </form>
  );
}
