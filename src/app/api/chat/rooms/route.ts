import { NextResponse } from "next/server";

import { getChatOverview } from "@/lib/social";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const overview = await getChatOverview(session.userId);
  return NextResponse.json({ conversations: overview });
}