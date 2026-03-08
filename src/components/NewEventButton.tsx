"use client";

import Link from "next/link";
import { signIn, useSession } from "next-auth/react";

export default function NewEventButton() {
  const { status } = useSession();

  if (status === "authenticated") {
    return (
      <Link
        className="btn-primary"
        href="/create"
      >
        Create activity
      </Link>
    );
  }

  return (
    <button
      className="btn-primary"
      onClick={() => signIn("google", { callbackUrl: "/create" })}
      type="button"
    >
      Create activity
    </button>
  );
}
