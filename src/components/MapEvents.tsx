"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import type { Icon } from "leaflet";
import type { Event } from "@/src/types/event";
import useCurrentLocation from "@/src/hooks/useCurrentLocation";

const markerIconUrl = typeof markerIcon === "string" ? markerIcon : markerIcon.src;
const markerIcon2xUrl =
  typeof markerIcon2x === "string" ? markerIcon2x : markerIcon2x.src;
const markerShadowUrl =
  typeof markerShadow === "string" ? markerShadow : markerShadow.src;

type MapEventsProps = {
  initialCenter: [number, number];
  initialZoom: number;
};

type LatLng = { lat: number; lng: number };

type MapViewControllerProps = {
  target: LatLng | null;
};

function MapViewController({ target }: MapViewControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (!target) {
      return;
    }

    map.setView([target.lat, target.lng], map.getZoom());
  }, [map, target]);

  return null;
}

export default function MapEvents({ initialCenter, initialZoom }: MapEventsProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(
    undefined,
  );
  const [defaultIcon, setDefaultIcon] = useState<Icon | undefined>(undefined);
  const [recenterTarget, setRecenterTarget] = useState<LatLng | null>(null);
  const { status, coords, requestLocation } = useCurrentLocation();
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const setupDefaultIcon = async () => {
      const leaflet = await import("leaflet");
      const icon = leaflet.icon({
        iconRetinaUrl: markerIcon2xUrl,
        iconUrl: markerIconUrl,
        shadowUrl: markerShadowUrl,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      if (isMounted) {
        setDefaultIcon(icon);
      }
    };

    void setupDefaultIcon();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadFromApi = async () => {
      try {
        setLoadError(null);
        const response = await fetch("/api/events", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch events");
        }

        const data = (await response.json()) as Event[];
        if (isMounted) {
          setEvents(Array.isArray(data) ? data : []);
        }
      } catch {
        if (isMounted) {
          setLoadError("Failed to load events.");
        }
      }
    };

    void loadFromApi();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (status === "success" && coords) {
      setRecenterTarget(coords);
    }
  }, [coords, status]);

  const mapCenter = useMemo<[number, number]>(() => {
    if (coords) {
      return [coords.lat, coords.lng];
    }

    return initialCenter;
  }, [coords, initialCenter]);

  const mapStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const handleDeleteEvent = async (id: string) => {
    try {
      const response = await fetch(`/api/events/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        return;
      }

      setEvents((prev) => prev.filter((event) => event.id !== id));
      setSelectedEventId((prev) => (prev === id ? undefined : prev));
    } catch {
      // No-op: keep UI stable if API delete fails.
    }
  };

  return (
    <div className="relative h-full w-full">
      <button
        className="absolute right-3 top-3 z-[1000] rounded-md bg-white px-3 py-1 text-xs font-medium shadow"
        onClick={requestLocation}
        type="button"
      >
        Use my location
      </button>
      {loadError ? (
        <p className="absolute left-3 top-3 z-[1000] rounded bg-white px-2 py-1 text-xs text-red-600 shadow">
          {loadError}
        </p>
      ) : null}
      <MapContainer center={mapCenter} style={mapStyle} zoom={initialZoom}>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewController target={recenterTarget} />
        {events.map((event) => (
          <Marker
            {...(defaultIcon ? { icon: defaultIcon } : {})}
            eventHandlers={{
              click: () => setSelectedEventId(event.id),
            }}
            key={event.id}
            position={[event.lat, event.lng]}
          >
            <Popup>
              <div className="space-y-2">
                <p
                  className={
                    selectedEventId === event.id
                      ? "font-semibold text-blue-700"
                      : "font-semibold"
                  }
                >
                  {event.title}
                </p>
                {event.address ? <p>{event.address}</p> : null}
                {event.dateISO ? (
                  <p className="text-sm text-gray-700">
                    {new Date(event.dateISO).toLocaleString()}
                  </p>
                ) : null}
                {event.description ? <p>{event.description}</p> : null}
                <p className="text-sm">
                  {event.lat.toFixed(5)}, {event.lng.toFixed(5)}
                </p>
                <button
                  className="rounded bg-red-600 px-2 py-1 text-sm text-white"
                  onClick={() => handleDeleteEvent(event.id)}
                  type="button"
                >
                  Delete
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
