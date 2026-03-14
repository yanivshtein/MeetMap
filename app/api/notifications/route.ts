import { NextResponse } from "next/server";
import { getAuthSession } from "@/src/lib/auth";
import { db } from "@/src/lib/db";

type NotificationResponseItem = {
  id: string;
  type: string;
  eventId: string | null;
  message: string;
  isRead: boolean;
  createdAt: Date;
  actionRequest:
    | {
        eventId: string;
        requestId: string;
      }
    | null;
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

export async function GET() {
  try {
    const session = await getAuthSession();
    const userId = await resolveUserId(session);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notifications = await db.notification.findMany({
      where: { userId },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    const actionableJoinRequests = await db.joinRequest.findMany({
      where: {
        status: "PENDING",
        eventId: {
          in: notifications
            .filter(
              (notification) =>
                notification.type === "JOIN_REQUESTED" && Boolean(notification.eventId),
            )
            .map((notification) => notification.eventId as string),
        },
      },
      select: {
        id: true,
        eventId: true,
        userId: true,
      },
    });

    const requestLookup = new Map(
      actionableJoinRequests.map((request) => [
        `${request.eventId}:${request.userId}`,
        request.id,
      ]),
    );

    const response: NotificationResponseItem[] = notifications.map((notification) => {
      const requestId =
        notification.type === "JOIN_REQUESTED" &&
        notification.eventId &&
        notification.actorId
          ? requestLookup.get(`${notification.eventId}:${notification.actorId}`) ?? null
          : null;

      return {
        ...notification,
        actionRequest:
          requestId && notification.eventId
            ? {
                eventId: notification.eventId,
                requestId,
              }
            : null,
      };
    });

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "production"
            ? "Server error while loading notifications."
            : `Server error while loading notifications: ${message}`,
      },
      { status: 500 },
    );
  }
}
