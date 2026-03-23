import { NextResponse } from "next/server";
import { findCityInText } from "@/src/lib/cities";

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
};

type NominatimReverseResult = {
  display_name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    suburb?: string;
    hamlet?: string;
    locality?: string;
    county?: string;
    state_district?: string;
  };
};

function resolveReverseGeocodedCity(data: NominatimReverseResult): string | null {
  const directLocationFields = [
    data.address?.city,
    data.address?.town,
    data.address?.village,
    data.address?.municipality,
    data.address?.suburb,
    data.address?.hamlet,
    data.address?.locality,
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  const directLocationMatch = directLocationFields
    .map((value) => (typeof value === "string" ? findCityInText(value) : null))
    .find((value): value is string => typeof value === "string" && value.length > 0);

  if (directLocationMatch) {
    return directLocationMatch;
  }

  if (directLocationFields.length > 0) {
    return null;
  }

  return findCityInText(data.display_name ?? "");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const latRaw = searchParams.get("lat");
  const lngRaw = searchParams.get("lng");

  const lat = latRaw !== null ? Number(latRaw) : Number.NaN;
  const lng = lngRaw !== null ? Number(lngRaw) : Number.NaN;

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    const nominatimUrl =
      "https://nominatim.openstreetmap.org/reverse?format=json&zoom=14&lat=" +
      encodeURIComponent(String(lat)) +
      "&lon=" +
      encodeURIComponent(String(lng));

    try {
      const response = await fetch(nominatimUrl, {
        headers: {
          "User-Agent": "event-planner-app",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        return NextResponse.json({ error: "Reverse geocoding failed" }, { status: 502 });
      }

      const data = (await response.json()) as NominatimReverseResult;
      return NextResponse.json({
        city: resolveReverseGeocodedCity(data),
        displayName: data.display_name ?? null,
      });
    } catch {
      return NextResponse.json({ error: "Reverse geocoding failed" }, { status: 502 });
    }
  }

  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const nominatimUrl =
    "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
    encodeURIComponent(query);

  try {
    const response = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "event-planner-app",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
    }

    const data = (await response.json()) as NominatimResult[];

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const first = data[0];
    const lat = Number(first.lat);
    const lng = Number(first.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
    }

    return NextResponse.json({
      lat,
      lng,
      displayName: first.display_name,
    });
  } catch {
    return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
  }
}
