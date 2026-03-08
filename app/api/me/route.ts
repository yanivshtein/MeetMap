import { NextResponse } from "next/server";
import { getAuthSession } from "@/src/lib/auth";
import { isValidCity } from "@/src/lib/cities";
import { db } from "@/src/lib/db";
import { isValidCategory, type EventCategory } from "@/src/lib/eventCategories";

type MeBody = {
  phone?: unknown;
  homeTown?: unknown;
  interestedCategories?: unknown;
};

function getSessionUser(session: Awaited<ReturnType<typeof getAuthSession>>) {
  return session?.user as { id?: string; email?: string } | undefined;
}

async function resolveUserId(
  session: Awaited<ReturnType<typeof getAuthSession>>,
) {
  const user = getSessionUser(session);

  if (user?.id) {
    return user.id;
  }

  if (user?.email) {
    const dbUser = await db.user.findUnique({
      where: { email: user.email },
      select: { id: true },
    });
    return dbUser?.id;
  }

  return undefined;
}

function isValidPhone(value: string) {
  return /^\+?[0-9]{7,20}$/.test(value);
}

export async function GET() {
  try {
    const session = await getAuthSession();
    const userId = await resolveUserId(session);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        phone: true,
        homeTown: true,
        interestedCategories: true,
      },
    });

    return NextResponse.json({
      phone: user?.phone ?? null,
      homeTown: user?.homeTown ?? null,
      interestedCategories: user?.interestedCategories ?? [],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "production"
            ? "Server error while loading profile."
            : `Server error while loading profile: ${message}`,
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getAuthSession();
    const userId = await resolveUserId(session);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: MeBody;
    try {
      body = (await request.json()) as MeBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const rawPhone = typeof body.phone === "string" ? body.phone.trim() : "";
    const rawHomeTown =
      typeof body.homeTown === "string" ? body.homeTown.trim() : "";
    const rawInterestedCategories = Array.isArray(body.interestedCategories)
      ? body.interestedCategories.filter(
          (item): item is string => typeof item === "string",
        )
      : [];
    const interestedCategories = rawInterestedCategories.filter(
      (item): item is EventCategory => isValidCategory(item),
    );

    if (rawPhone && !isValidPhone(rawPhone)) {
      return NextResponse.json(
        { error: "Phone must contain only + and digits, length 7-20." },
        { status: 400 },
      );
    }

    if (rawInterestedCategories.length !== interestedCategories.length) {
      return NextResponse.json(
        { error: "Interested categories contain invalid values." },
        { status: 400 },
      );
    }

    if (rawHomeTown && !isValidCity(rawHomeTown)) {
      return NextResponse.json(
        { error: "Please choose a home town from the list." },
        { status: 400 },
      );
    }

    const user = await db.user.update({
      where: { id: userId },
      data: {
        phone: rawPhone || null,
        homeTown: rawHomeTown || null,
        interestedCategories,
      },
      select: {
        phone: true,
        homeTown: true,
        interestedCategories: true,
      },
    });

    return NextResponse.json({
      phone: user.phone ?? null,
      homeTown: user.homeTown ?? null,
      interestedCategories: user.interestedCategories,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "production"
            ? "Server error while updating profile."
            : `Server error while updating profile: ${message}`,
      },
      { status: 500 },
    );
  }
}
