"use client";

import dynamic from "next/dynamic";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import CreateEventForm from "@/src/components/CreateEventForm";

type LatLng = { lat: number; lng: number };
type LocationStatus = "idle" | "loading" | "success" | "error";

const LocationPickerMap = dynamic(
  () => import("@/src/components/LocationPickerMap"),
  {
    ssr: false,
  },
);

export default function CreatePage() {
  const router = useRouter();
  const { status } = useSession();
  const [pickedLatLng, setPickedLatLng] = useState<LatLng | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [locationError, setLocationError] = useState<string | null>(null);

  if (status === "loading") {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <p className="text-sm text-gray-600">Checking authentication...</p>
      </main>
    );
  }

  if (status !== "authenticated") {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <h1 className="text-2xl font-semibold">Create Event</h1>
        <p className="mt-3 text-gray-700">Please sign in to create an event.</p>
        <button
          className="mt-4 rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
          onClick={() => signIn("google", { callbackUrl: "/create" })}
          type="button"
        >
          Sign in with Google
        </button>
      </main>
    );
  }

  const locationStatusText =
    locationStatus === "loading"
      ? "Getting your location..."
      : locationStatus === "success"
        ? "Centered on your location."
        : locationStatus === "error"
          ? `${locationError ?? "Could not get your location."} You can still choose a location by clicking the map.`
          : "Click the map to choose event location.";

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-semibold">Create Event</h1>
      <p className="mt-2 text-sm text-gray-600">
        Click the map to choose event location.
      </p>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <CreateEventForm
            onPickedLatLngChange={setPickedLatLng}
            onSubmitSuccess={() => router.push("/")}
            pickedLatLng={pickedLatLng}
          />
        </div>

        <div className="rounded-xl border p-3">
          <p className="text-sm text-gray-600">{locationStatusText}</p>
          <div className="mt-3 h-[360px] overflow-hidden rounded-lg">
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
