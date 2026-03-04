import type { EventCategory } from "@/src/lib/eventCategories";

export type Event = {
  id: string;
  category: EventCategory;
  customCategoryTitle?: string;
  title: string;
  userId?: string;
  address?: string;
  description?: string;
  dateISO?: string;
  lat: number;
  lng: number;
  createdAtISO: string;
};
