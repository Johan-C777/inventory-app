// Sin dependencias de Next: lo usan proxy.ts y lib/auth.ts.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "inv_session";
export const SESSION_TTL = 60 * 60 * 24 * 7;

function key() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET sin configurar (mínimo 32 caracteres)");
  return new TextEncoder().encode(s);
}

export const signSession = () =>
  new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL}s`)
    .sign(key());

export async function verifySession(token: string | undefined) {
  if (!token) return false;
  try {
    await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}
