import { NextResponse } from "next/server";
import { getAuthSession } from "@/src/lib/auth";
import { db } from "@/src/lib/db";

function getSessionUser(
  session: Awaited<ReturnType<typeof getAuthSession>>,
) {
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

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getAuthSession();
  const userId = await resolveUserId(session);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const event = await db.event.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (event.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.event.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true });
}
