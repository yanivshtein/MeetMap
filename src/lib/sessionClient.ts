"use client";

import { useSession } from "next-auth/react";

export function useSessionClient() {
  const { data, status } = useSession();

  const userId = data?.user?.id ?? null;

  return {
    session: data,
    status,
    userId,
    isAuthenticated: status === "authenticated",
  };
}
