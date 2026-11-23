"use server";

import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { createSession, deleteSession } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { landingPath } from "@/lib/navigation";

import { failWithFields, type FieldErrors, type FormErrorState } from "@/lib/form-errors";

export type LoginState = FormErrorState;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const fieldErrors: FieldErrors = {};
  if (!email) fieldErrors.email = "Enter your email.";
  if (!password) fieldErrors.password = "Enter your password.";
  const invalid = failWithFields(fieldErrors);
  if (invalid) return invalid;

  let destination = "/";
  try {
    const { rows } = await query<{ id: number; name: string; email: string; password_hash: string; is_active: boolean; session_version: number; role: string; permissions: string[] }>(
      "SELECT id, name, email, password_hash, is_active, session_version, role, permissions FROM users WHERE lower(email) = $1",
      [email]
    );
    const user = rows[0];
    if (!user || !user.is_active || !verifyPassword(password, user.password_hash)) {
      return { fieldErrors: { password: "Invalid email or password." } };
    }
    await createSession(user);
    destination = landingPath(user.role === "admin", (permission) => hasPermission(user, permission));
    if (destination === "/settings" && hasPermission(user, "shopify")) destination = "/settings#shopify";
  } catch (e) {
    console.error("login failed", e);
    return { error: "Could not sign you in. Check that the database is reachable." };
  }

  redirect(destination);
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
