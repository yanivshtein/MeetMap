"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function AppChrome() {
  const pathname = usePathname();
  const shouldHideNavbar = pathname === "/onboarding";

  if (shouldHideNavbar) {
    return null;
  }

  return <Navbar />;
}
