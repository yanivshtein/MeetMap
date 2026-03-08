"use client";

import dynamic from "next/dynamic";
import type { MapBounds } from "@/src/components/MapEvents";
import type { Event } from "@/src/types/event";

type MapEventsClientProps = {
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

const MapEvents = dynamic(() => import("@/src/components/MapEvents"), {
  ssr: false,
});

export default function MapEventsClient({
  initialCenter,
  initialZoom,
  events,
  selectedEventId,
  pendingFocusEventId,
  onSelect,
  onFocusHandled,
  onDeleted,
  onBoundsChange,
}: MapEventsClientProps) {
  return (
    <MapEvents
      events={events}
      initialCenter={initialCenter}
      initialZoom={initialZoom}
      onBoundsChange={onBoundsChange}
      onDeleted={onDeleted}
      onFocusHandled={onFocusHandled}
      onSelect={onSelect}
      pendingFocusEventId={pendingFocusEventId}
      selectedEventId={selectedEventId}
    />
  );
}
