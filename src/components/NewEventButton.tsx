"use client";

import Link from "next/link";
import { signIn, useSession } from "next-auth/react";

export default function NewEventButton() {
  const { status } = useSession();

  if (status === "authenticated") {
    return (
      <Link
        className="inline-flex rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
        href="/create"
      >
        + New Event
      </Link>
    );
  }

  return (
    <button
      className="inline-flex rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
      onClick={() => signIn("google", { callbackUrl: "/create" })}
      type="button"
    >
      + New Event
    </button>
  );
}
