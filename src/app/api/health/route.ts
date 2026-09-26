import { NextResponse } from "next/server";

import { APP_NAME } from "@/lib/config";
import { prisma } from "@/lib/prisma";

const startedAt = Date.now();

export const dynamic = "force-dynamic";

export async function GET() {
  let db = "down";
  let users = 0;
  let works = 0;
  try {
    const [userCount, workCount] = await prisma.$transaction([
      prisma.user.count(),
      prisma.work.count(),
    ]);
    users = userCount;
    works = workCount;
    db = "up";
  } catch (error) {
    console.error("health check: db unavailable", error);
  }

  const status = db === "up";
  return NextResponse.json(
    {
      ok: status,
      name: APP_NAME,
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      time: new Date().toISOString(),
      db,
      counts: { users, works },
      features: {
        emojia: Boolean(process.env.EMOJIA_API_URL),
        externalSearch: process.env.DISCOVERY_EXTERNAL_SEARCH === "1",
      },
    },
    { status: status ? 200 : 503 }
  );
}