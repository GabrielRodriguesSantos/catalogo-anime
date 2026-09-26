import { NextResponse, type NextRequest } from "next/server";

import { isAdultRating, isAdultViewer } from "@/lib/content-gates";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const workId = request.nextUrl.searchParams.get("workId");
  if (!workId) return NextResponse.json({ error: "Faltou a obra" }, { status: 400 });

  const work = await prisma.work.findUnique({
    where: { id: workId },
    select: {
      id: true,
      title: true,
      type: true,
      coverUrl: true,
      year: true,
      status: true,
      ageRating: true,
    },
  });
  if (!work) return NextResponse.json({ error: "Obra não encontrada" }, { status: 404 });

  if (isAdultRating(work.ageRating) && !(await isAdultViewer(session.userId))) {
    return NextResponse.json({ error: "Obra não encontrada" }, { status: 404 });
  }

  return NextResponse.json({ work });
}