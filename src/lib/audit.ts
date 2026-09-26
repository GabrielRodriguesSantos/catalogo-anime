import "server-only";

import { prisma } from "@/lib/prisma";

export type AuditInput = {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: unknown;
  ip?: string | null;
  userAgent?: string | null;
};

export async function logAudit(input: AuditInput): Promise<void> {
  const { metadata, ...rest } = input;

  await prisma.auditLog.create({
    data: {
      userId: rest.userId ?? null,
      action: rest.action,
      entity: rest.entity,
      entityId: rest.entityId ?? null,
      metadata: metadata === undefined ? null : JSON.stringify(metadata),
      ip: rest.ip ?? null,
      userAgent: rest.userAgent ?? null,
    },
  });
}