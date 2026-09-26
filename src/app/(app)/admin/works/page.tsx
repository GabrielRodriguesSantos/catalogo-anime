import type { Metadata } from "next";

import CreateWorkForm from "@/components/create-work-form";
import WorkRatingManager from "@/components/work-rating-manager";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Cadastrar obra",
};

export default async function AdminWorksPage() {
  await requireAdmin();

  const works = await prisma.work.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, title: true, type: true, ageRating: true },
  });

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <CreateWorkForm />
      <WorkRatingManager works={works} />
    </div>
  );
}