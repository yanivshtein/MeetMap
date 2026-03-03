import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

export const dynamic = "force-dynamic";

type CreateEventBody = {
  title?: unknown;
  description?: unknown;
  address?: unknown;
  dateISO?: unknown;
  lat?: unknown;
  lng?: unknown;
};

export async function GET() {
  const events = await db.event.findMany({
    orderBy: {
      createdAtISO: "desc",
    },
  });

  return NextResponse.json(events);
}

export async function POST(request: Request) {
  let body: CreateEventBody;

  try {
    body = (await request.json()) as CreateEventBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : undefined;
  const address = typeof body.address === "string" ? body.address.trim() : undefined;
  const dateISO = typeof body.dateISO === "string" ? body.dateISO : undefined;
  const lat = typeof body.lat === "number" ? body.lat : Number.NaN;
  const lng = typeof body.lng === "number" ? body.lng : Number.NaN;

  if (title.length < 2) {
    return NextResponse.json(
      { error: "Title must be at least 2 characters." },
      { status: 400 },
    );
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "Latitude and longitude are required." },
      { status: 400 },
    );
  }

  if (dateISO) {
    const parsed = new Date(dateISO);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "Date must be valid." }, { status: 400 });
    }
  }

  const event = await db.event.create({
    data: {
      id:
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : Date.now().toString(),
      title,
      description: description || null,
      address: address || null,
      dateISO: dateISO || null,
      lat,
      lng,
      createdAtISO: new Date().toISOString(),
    },
  });

  return NextResponse.json(event, { status: 201 });
}
