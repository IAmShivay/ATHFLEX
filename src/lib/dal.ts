import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, type SessionPayload } from "./auth";
import { query } from "./db";
import { hasPermission, type Permission } from "./permissions";

export type DashboardUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  is_active: boolean;
  session_version: number;
};

export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const token = (await cookies()).get("session")?.value;
  return verifySessionToken(token);
});

export const getOptionalUser = cache(async (): Promise<DashboardUser | null> => {
  const session = await getSession();
  if (!session) return null;
  const { rows } = await query<DashboardUser>(
    "SELECT id, name, email, role, permissions, is_active, session_version FROM users WHERE id = $1",
    [session.uid]
  );
  const user = rows[0];
  if (!user || !user.is_active || user.session_version !== session.version) return null;
  return user;
});

export const getUser = cache(async (): Promise<DashboardUser> => {
  const user = await getOptionalUser();
  if (!user) redirect("/login");
  return user;
});

export async function requirePermission(permission: Permission): Promise<DashboardUser> {
  const user = await getUser();
  if (!hasPermission(user, permission)) redirect("/access-denied");
  return user;
}

export async function requireAdmin(): Promise<DashboardUser> {
  const user = await getUser();
  if (user.role !== "admin") redirect("/access-denied");
  return user;
}
