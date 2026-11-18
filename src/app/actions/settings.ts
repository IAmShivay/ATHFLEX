"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { getUser, requirePermission } from "@/lib/dal";
import { createSession } from "@/lib/session";
import { failWithFields, type FieldErrors, type FormErrorState } from "@/lib/form-errors";

export type FormState = FormErrorState & { success?: string };

const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 256;

export async function updateStoreInfo(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("store_settings");
  const storeName = String(formData.get("store_name") ?? "").trim();
  const storeEmail = String(formData.get("store_email") ?? "").trim();
  const currency = String(formData.get("currency") ?? "USD");
  const timezone = String(formData.get("timezone") ?? "UTC");

  const fieldErrors: FieldErrors = {};
  if (!storeName) fieldErrors.store_name = "Store name is required.";
  if (!storeEmail) fieldErrors.store_email = "Sender email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(storeEmail)) fieldErrors.store_email = "Enter a valid email address.";
  const invalid = failWithFields(fieldErrors);
  if (invalid) return invalid;

  try {
    await query(
      `UPDATE store_settings SET store_name = $1, store_email = $2, currency = $3, timezone = $4
       WHERE id = (SELECT id FROM store_settings ORDER BY id LIMIT 1)`,
      [storeName, storeEmail, currency, timezone]
    );
  } catch (e) {
    console.error(e);
    return { error: "Could not save store details." };
  }
  revalidatePath("/settings");
  revalidatePath("/");
  return { success: `Store details saved by ${user.email}.` };
}

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { fieldErrors: { name: "Name is required." } };
  try {
    await query("UPDATE users SET name = $1 WHERE id = $2", [name, user.id]);
  } catch (e) {
    console.error(e);
    return { error: "Could not save your profile." };
  }
  revalidatePath("/settings");
  return { success: "Profile updated." };
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getUser();
  const current = String(formData.get("current_password") ?? "");
  const next = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  const fieldErrors: FieldErrors = {};
  if (!current) fieldErrors.current_password = "Enter your current password.";
  if (next.length < PASSWORD_MIN_LENGTH || next.length > PASSWORD_MAX_LENGTH) {
    fieldErrors.new_password = `New password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.`;
  }
  if (next !== confirm) fieldErrors.confirm_password = "New passwords do not match.";
  const invalid = failWithFields(fieldErrors);
  if (invalid) return invalid;

  try {
    const { rows } = await query<{ password_hash: string }>(
      "SELECT password_hash FROM users WHERE id = $1",
      [user.id]
    );
    if (!rows[0] || !verifyPassword(current, rows[0].password_hash)) {
      return { fieldErrors: { current_password: "Current password is incorrect." } };
    }
    const updated = await query<{ session_version: number }>(
      "UPDATE users SET password_hash = $1, session_version = session_version + 1 WHERE id = $2 AND password_hash = $3 RETURNING session_version",
      [hashPassword(next), user.id, rows[0].password_hash]
    );
    if (!updated.rows[0]) return { error: "Your password changed. Please try again." };
    await createSession({ ...user, session_version: updated.rows[0].session_version });
  } catch (e) {
    console.error(e);
    return { error: "Could not change password." };
  }
  return { success: "Password changed." };
}
