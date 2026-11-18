import { cookies } from "next/headers";
import { signSession, type SessionPayload } from "./auth";

const COOKIE_NAME = "session";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function createSession(user: { id: number | string; email: string; name: string; session_version: number }) {
  const payload: SessionPayload = {
    uid: String(user.id),
    email: user.email,
    name: user.name,
    version: user.session_version,
    exp: Date.now() + WEEK_MS,
  };
  const token = signSession(payload);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: WEEK_MS / 1000,
    path: "/",
  });
}

export async function deleteSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
