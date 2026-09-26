import { SESSION_TTL_DAYS } from "@/lib/config";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export interface SessionPayload extends JWTPayload {
  userId: string;
  username: string;
  role: string;
}

const secretKey = process.env.SESSION_SECRET ?? "";
const encodedKey = new TextEncoder().encode(secretKey);

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_DAYS}d`)
    .sign(encodedKey);
}

export async function decrypt(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  if (!token || secretKey.length === 0) return null;
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}