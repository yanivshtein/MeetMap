import type { EventCategory } from "@/src/lib/eventCategories";
import type {
  ContactMethod,
  ContactVisibility,
} from "@/src/lib/contactMethods";

export type Event = {
  id: string;
  category: EventCategory;
  customCategoryTitle?: string;
  contactMethod: ContactMethod;
  contactVisibility: ContactVisibility;
  whatsappInviteUrl?: string;
  title: string;
  city?: string;
  autoApprove?: boolean;
  userId?: string;
  user?: {
    id: string;
    name?: string | null;
    image?: string | null;
  };
  attendanceCount?: number;
  _count?: {
    attendances?: number;
  };
  address?: string;
  description?: string;
  dateISO?: string;
  lat: number;
  lng: number;
  createdAtISO: string;
};
