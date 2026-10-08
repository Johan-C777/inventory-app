import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_TTL, signSession, verifySession } from "./session";

const digest = (s: string) => createHash("sha256").update(s).digest();

export function checkPassword(input: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false; // falla cerrado
  return timingSafeEqual(digest(input), digest(expected));
}

export async function createSession() {
  (await cookies()).set(SESSION_COOKIE, await signSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL,
    path: "/",
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export const hasSession = async () => verifySession((await cookies()).get(SESSION_COOKIE)?.value);

/** Páginas y layouts. */
export async function requireSession() {
  if (!(await hasSession())) redirect("/login");
}
