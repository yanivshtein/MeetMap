"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { getCategoryDisplay } from "@/src/lib/eventCategories";
import type { Event } from "@/src/types/event";

type BottomEventCardProps = {
  event: Event | null;
  isOwner: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
};

export default function BottomEventCard({
  event,
  isOwner,
  onClose,
  onDelete,
}: BottomEventCardProps) {
  const categoryMeta = useMemo(
    () =>
      event
        ? getCategoryDisplay(event.category, event.customCategoryTitle)
        : null,
    [event],
  );
  const formattedDate = event?.dateISO
    ? new Date(event.dateISO).toLocaleString()
    : null;
  const attendeeCount = event?.attendanceCount ?? event?._count?.attendances;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[1200] flex justify-center px-0 sm:bottom-6 sm:px-4">
      <Card
        className={[
          "pointer-events-auto transform transition duration-200",
          "w-full max-w-none rounded-t-2xl p-5 sm:w-[90%] sm:max-w-xl sm:rounded-2xl",
          event
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0 pointer-events-none",
        ].join(" ")}
      >
        {event ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xl font-semibold text-gray-900">
                {categoryMeta?.emoji ?? "📍"} {event.title}
              </p>
              <button
                aria-label="Close event card"
                className="text-xl leading-none text-gray-500 transition hover:text-gray-800"
                onClick={onClose}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="flex flex-col gap-1 text-sm text-gray-600">
              {event.city ? <p>📍 {event.city}</p> : null}
              {formattedDate ? <p>🕒 {formattedDate}</p> : null}
              {typeof attendeeCount === "number" ? (
                <p>👥 {attendeeCount} attending</p>
              ) : null}
            </div>

            <Button asChild className="w-full">
              <Link href={`/events/${event.id}`}>View details</Link>
            </Button>

            {isOwner ? (
              <div className="flex gap-4 text-sm">
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/edit/${event.id}`}>Edit</Link>
                </Button>
                <Button
                  className="px-0"
                  onClick={() => onDelete(event.id)}
                  size="sm"
                  type="button"
                  variant="danger-ghost"
                >
                  Delete
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
