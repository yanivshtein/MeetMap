"use client";

import L, { type DivIcon, type Marker as LeafletMarker } from "leaflet";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import MarkerClusterGroup from "react-leaflet-cluster";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
import {
  CATEGORY_OPTIONS,
  getCategoryDisplay,
  isValidCategory,
  type EventCategory,
} from "@/src/lib/eventCategories";
import { useSessionClient } from "@/src/lib/sessionClient";
import type { Event } from "@/src/types/event";
import useCurrentLocation from "@/src/hooks/useCurrentLocation";

type MapEventsProps = {
  initialCenter: [number, number];
  initialZoom: number;
  events: Event[];
  selectedEventId: string | null;
  pendingFocusEventId: string | null;
  onSelect: (id: string) => void;
  onFocusHandled: () => void;
  onDeleted?: (id: string) => void;
  onBoundsChange?: (bounds: MapBounds) => void;
};

type LatLng = { lat: number; lng: number };
export type MapBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

type FocusControllerProps = {
  pendingFocusEventId: string | null;
  eventsById: ReadonlyMap<string, Event>;
  markerRefs: React.MutableRefObject<Record<string, LeafletMarker | null>>;
  userMovedMapRef: React.MutableRefObject<boolean>;
  ignoreNextBoundsFetchRef: React.MutableRefObject<boolean>;
  onFocusHandled: () => void;
};

type RecenterControllerProps = {
  target: LatLng | null;
};

type InitialCenterControllerProps = {
  events: Event[];
  mapInitialized: boolean;
  userHasMovedMap: boolean;
  onMapInitialized: () => void;
  ignoreNextBoundsFetchRef: React.MutableRefObject<boolean>;
};

type BoundsControllerProps = {
  onBoundsChange?: (bounds: MapBounds) => void;
  ignoreNextBoundsFetchRef: React.MutableRefObject<boolean>;
};

type InteractionControllerProps = {
  onUserMoveMap: () => void;
};

type MapReadyGateProps = {
  children: ReactNode;
};

function makeEmojiIcon(emoji: string): DivIcon {
  return L.divIcon({
    className: "emoji-marker",
    html: `<div class=\"emoji-pin\">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function makeClusterIcon(clusterSize: number): DivIcon {
  return L.divIcon({
    className: "event-cluster-icon",
    html: `<div class="event-cluster-badge">${clusterSize}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

function FocusController({
  pendingFocusEventId,
  eventsById,
  markerRefs,
  userMovedMapRef,
  ignoreNextBoundsFetchRef,
  onFocusHandled,
}: FocusControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (!pendingFocusEventId) {
      return;
    }

    if (userMovedMapRef.current) {
      onFocusHandled();
      return;
    }

    const selectedEvent = eventsById.get(pendingFocusEventId);
    if (!selectedEvent) {
      onFocusHandled();
      return;
    }

    ignoreNextBoundsFetchRef.current = true;
    map.flyTo([selectedEvent.lat, selectedEvent.lng], map.getZoom(), {
      animate: true,
      duration: 0.5,
    });

    const marker = markerRefs.current[selectedEvent.id];
    marker?.openPopup();
    onFocusHandled();
  }, [
    eventsById,
    ignoreNextBoundsFetchRef,
    map,
    markerRefs,
    onFocusHandled,
    pendingFocusEventId,
    userMovedMapRef,
  ]);

  return null;
}

function InitialCenterController({
  events,
  mapInitialized,
  userHasMovedMap,
  onMapInitialized,
  ignoreNextBoundsFetchRef,
}: InitialCenterControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (mapInitialized || userHasMovedMap || events.length === 0) {
      return;
    }

    const firstEvent = events[0];
    ignoreNextBoundsFetchRef.current = true;
    map.setView([firstEvent.lat, firstEvent.lng], map.getZoom(), {
      animate: false,
    });
    onMapInitialized();
  }, [
    events,
    ignoreNextBoundsFetchRef,
    map,
    mapInitialized,
    onMapInitialized,
    userHasMovedMap,
  ]);

  return null;
}

function RecenterController({ target }: RecenterControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (!target) {
      return;
    }

    map.flyTo([target.lat, target.lng], map.getZoom(), {
      animate: true,
      duration: 0.5,
    });
  }, [map, target]);

  return null;
}

function InteractionController({ onUserMoveMap }: InteractionControllerProps) {
  useMapEvents({
    dragstart: (event) => {
      if ("originalEvent" in event && event.originalEvent) {
        onUserMoveMap();
      }
    },
    movestart: (event) => {
      if ("originalEvent" in event && event.originalEvent) {
        onUserMoveMap();
      }
    },
    zoomstart: (event) => {
      if ("originalEvent" in event && event.originalEvent) {
        onUserMoveMap();
      }
    },
  });

  return null;
}

function BoundsController({
  onBoundsChange,
  ignoreNextBoundsFetchRef,
}: BoundsControllerProps) {
  const map = useMapEvents({
    moveend: () => {
      if (ignoreNextBoundsFetchRef.current) {
        ignoreNextBoundsFetchRef.current = false;
        return;
      }

      const bounds = map.getBounds();
      onBoundsChange?.({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
    },
    zoomend: () => {
      if (ignoreNextBoundsFetchRef.current) {
        ignoreNextBoundsFetchRef.current = false;
        return;
      }

      const bounds = map.getBounds();
      onBoundsChange?.({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
    },
  });

  useEffect(() => {
    const bounds = map.getBounds();
    onBoundsChange?.({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    });
  }, [map, onBoundsChange]);

  return null;
}

function MapReadyGate({ children }: MapReadyGateProps) {
  const map = useMap();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    map.whenReady(() => {
      if (!cancelled) {
        setIsReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [map]);

  if (!isReady) {
    return null;
  }

  return <>{children}</>;
}

export default function MapEvents({
  initialCenter,
  initialZoom,
  events,
  selectedEventId,
  pendingFocusEventId,
  onSelect,
  onFocusHandled,
  onDeleted,
  onBoundsChange,
}: MapEventsProps) {
  const markerRefs = useRef<Record<string, LeafletMarker | null>>({});
  const { status, coords, requestLocation } = useCurrentLocation();
  const { userId } = useSessionClient();
  const [mapInitialized, setMapInitialized] = useState(false);
  const [userHasMovedMap, setUserHasMovedMap] = useState(false);
  const [recenterTarget, setRecenterTarget] = useState<LatLng | null>(null);
  const userMovedMapRef = useRef(false);
  const ignoreNextBoundsFetchRef = useRef(false);
  const shouldRecenterToCurrentLocationRef = useRef(false);

  const mapCenter = useMemo<[number, number]>(() => {
    if (coords) {
      return [coords.lat, coords.lng];
    }

    return initialCenter;
  }, [coords, initialCenter]);

  const mapStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const iconMap = useMemo(() => {
    const map = {} as Record<EventCategory, DivIcon>;
    CATEGORY_OPTIONS.forEach((option) => {
      map[option.value] = makeEmojiIcon(option.emoji);
    });
    return map;
  }, []);
  const fallbackIcon = useMemo(() => makeEmojiIcon("📍"), []);

  const getMarkerIcon = (category: string) => {
    if (isValidCategory(category)) {
      return iconMap[category];
    }

    return fallbackIcon;
  };
  const eventsById = useMemo(
    () => new Map(events.map((event) => [event.id, event])),
    [events],
  );

  const handleDeleteEvent = async (id: string) => {
    try {
      const response = await fetch(`/api/events/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        return;
      }

      onDeleted?.(id);
    } catch {
      // Keep UI stable if API delete fails.
    }
  };

  const handleUseMyLocation = () => {
    shouldRecenterToCurrentLocationRef.current = true;
    requestLocation();

    if (coords) {
      ignoreNextBoundsFetchRef.current = true;
      setRecenterTarget(coords);
      shouldRecenterToCurrentLocationRef.current = false;
    }
  };

  useEffect(() => {
    if (
      status === "success" &&
      coords &&
      shouldRecenterToCurrentLocationRef.current
    ) {
      ignoreNextBoundsFetchRef.current = true;
      setRecenterTarget(coords);
      shouldRecenterToCurrentLocationRef.current = false;
    }
  }, [coords, status]);

  return (
    <div className="relative h-full w-full">
      <button
        className="absolute right-3 top-3 z-[1000] rounded-md bg-white px-3 py-1 text-xs font-medium shadow"
        onClick={handleUseMyLocation}
        type="button"
      >
        Use my location
      </button>

      <MapContainer center={mapCenter} style={mapStyle} zoom={initialZoom}>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <InteractionController
          onUserMoveMap={() => {
            userMovedMapRef.current = true;
            setUserHasMovedMap(true);
            onFocusHandled();
          }}
        />
        <InitialCenterController
          events={events}
          ignoreNextBoundsFetchRef={ignoreNextBoundsFetchRef}
          mapInitialized={mapInitialized}
          onMapInitialized={() => setMapInitialized(true)}
          userHasMovedMap={userHasMovedMap}
        />
        <FocusController
          eventsById={eventsById}
          ignoreNextBoundsFetchRef={ignoreNextBoundsFetchRef}
          markerRefs={markerRefs}
          onFocusHandled={onFocusHandled}
          pendingFocusEventId={pendingFocusEventId}
          userMovedMapRef={userMovedMapRef}
        />
        <BoundsController
          ignoreNextBoundsFetchRef={ignoreNextBoundsFetchRef}
          onBoundsChange={onBoundsChange}
        />
        <RecenterController target={recenterTarget} />

        <MapReadyGate>
          <MarkerClusterGroup
            disableClusteringAtZoom={16}
            iconCreateFunction={(cluster: L.MarkerCluster) =>
              makeClusterIcon(cluster.getChildCount())
            }
            maxClusterRadius={60}
            showCoverageOnHover={false}
            spiderfyOnMaxZoom
          >
            {events.map((event) => {
              const categoryMeta = getCategoryDisplay(
                event.category,
                event.customCategoryTitle,
              );
              const attendeeCount =
                event.attendanceCount ?? event._count?.attendances;
              const formattedDate = event.dateISO
                ? new Date(event.dateISO).toLocaleString()
                : null;
              const displayTitle = event.city
                ? `${categoryMeta.label} in ${event.city}`
                : event.title;

              return (
                <Marker
                  eventHandlers={{
                    click: () => onSelect(event.id),
                  }}
                  icon={getMarkerIcon(event.category)}
                  key={event.id}
                  position={[event.lat, event.lng]}
                  ref={(marker) => {
                    markerRefs.current[event.id] = marker;
                  }}
                >
                  <Popup>
                    <div className="space-y-2">
                      <p
                        className={
                          selectedEventId === event.id
                            ? "font-semibold text-indigo-700"
                            : "font-semibold text-gray-900"
                        }
                      >
                        {categoryMeta.emoji} {displayTitle}
                      </p>
                      {event.city ? (
                        <p className="text-sm text-gray-700">📍 {event.city}</p>
                      ) : null}
                      {formattedDate ? (
                        <p className="text-sm text-gray-700">
                          🕒 {formattedDate}
                        </p>
                      ) : null}
                      {typeof attendeeCount === "number" ? (
                        <p className="text-sm text-gray-600">
                          👥 {attendeeCount} attending
                        </p>
                      ) : null}
                      {event.address ? <p className="text-sm">{event.address}</p> : null}
                      {event.description ? <p>{event.description}</p> : null}
                      <Link
                        className="inline-block text-sm text-indigo-700 underline"
                        href={`/events/${event.id}`}
                      >
                        View details
                      </Link>
                      {userId && event.userId === userId ? (
                        <div className="flex items-center gap-2">
                          <Link
                            className="rounded bg-gray-800 px-2 py-1 text-sm text-white"
                            href={`/edit/${event.id}`}
                          >
                            Edit
                          </Link>
                          <button
                            className="rounded bg-red-600 px-2 py-1 text-sm text-white"
                            onClick={() => handleDeleteEvent(event.id)}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MarkerClusterGroup>
        </MapReadyGate>
      </MapContainer>
    </div>
  );
}
