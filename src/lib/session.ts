import "server-only";

import { cookies } from "next/headers";

import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
} from "@/lib/config";
import { decrypt, encrypt, type SessionPayload } from "@/lib/token";

export type { SessionPayload };
export { SESSION_COOKIE };

function createCookieOptions() {
  const expires = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await encrypt(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, createCookieOptions());
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return decrypt(token);
}