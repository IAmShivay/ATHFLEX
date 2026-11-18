"use server";

import { revalidatePath } from "next/cache";
import { hashPassword } from "@/lib/auth";
import { requireAdmin } from "@/lib/dal";
import { pool } from "@/lib/db";
import { isPermission } from "@/lib/permissions";
import { failWithFields, formFailure, ValidationError, type FieldErrors, type FormErrorState } from "@/lib/form-errors";

export type UserFormState = FormErrorState & { success?: string };

const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 256;
const NAME_MAX_LENGTH = 120;
const EMAIL_MAX_LENGTH = 254;

export async function saveUser(_previous: UserFormState, formData: FormData): Promise<UserFormState> {
  const actor = await requireAdmin();
  const rawId = String(formData.get("id") ?? "");
  const id = rawId ? Number(rawId) : null;
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "");
  const password = String(formData.get("password") ?? "");
  const permissions = [...new Set(formData.getAll("permissions").map(String))].sort();
  const active = formData.get("is_active") === "on";

  if (id !== null && (!Number.isSafeInteger(id) || id <= 0)) return { error: "Invalid user." };
  const fieldErrors: FieldErrors = {};
  if (!name || name.length > NAME_MAX_LENGTH) fieldErrors.name = `Enter a name of up to ${NAME_MAX_LENGTH} characters.`;
  if (email.length > EMAIL_MAX_LENGTH || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = "Enter a valid email address.";
  if (role !== "admin" && role !== "staff") fieldErrors.role = "Choose a valid role.";
  if (permissions.some((permission) => !isPermission(permission))) fieldErrors.permissions = "Invalid permission.";
  if ((!id || password) && (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH)) {
    fieldErrors.password = `Passwords must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.`;
  }
  const invalid = failWithFields(fieldErrors);
  if (invalid) return invalid;
  if (id === actor.id) return { error: "Use account settings to update your own profile or password. Another administrator must change your access." };

  const passwordHash = password ? hashPassword(password) : null;
  const selectedPermissions = role === "admin" ? [] : permissions;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Serialize access changes so concurrent administrators cannot remove the last admin.
    await client.query("SELECT pg_advisory_xact_lock(624839101)");
    const actorResult = await client.query("SELECT role, is_active, session_version FROM users WHERE id = $1 FOR UPDATE", [actor.id]);
    const currentActor = actorResult.rows[0];
    if (!currentActor || currentActor.role !== "admin" || !currentActor.is_active || currentActor.session_version !== actor.session_version) {
      throw new ValidationError("Your administrator access has changed. Sign in again.");
    }
    let targetId: number;
    let auditAction: string;
    if (id) {
      const targetResult = await client.query("SELECT role, is_active, permissions FROM users WHERE id = $1 FOR UPDATE", [id]);
      const target = targetResult.rows[0];
      if (!target) throw new ValidationError("This user no longer exists.");
      if (target.role === "admin" && target.is_active && (role !== "admin" || !active)) {
        const admins = await client.query("SELECT count(*)::int AS count FROM users WHERE role = 'admin' AND is_active");
        if (admins.rows[0].count <= 1) throw new ValidationError("At least one active administrator is required.");
      }
      const changedAccess = target.role !== role || target.is_active !== active || JSON.stringify([...target.permissions].sort()) !== JSON.stringify(selectedPermissions);
      await client.query(
        `UPDATE users SET name = $1, email = $2, role = $3, permissions = $4, is_active = $5,
         password_hash = COALESCE($6, password_hash), session_version = session_version + $7 WHERE id = $8`,
        [name, email, role, selectedPermissions, active, passwordHash, changedAccess || passwordHash ? 1 : 0, id]
      );
      targetId = id;
      auditAction = "updated";
    } else {
      const result = await client.query(
        "INSERT INTO users (name, email, password_hash, role, permissions, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
        [name, email, passwordHash, role, selectedPermissions, active]
      );
      targetId = result.rows[0].id;
      auditAction = "created";
    }
    await client.query("INSERT INTO user_access_audit (actor_id, target_id, action, details) VALUES ($1, $2, $3, $4)",
      [actor.id, targetId, auditAction, JSON.stringify({ role, permissions: selectedPermissions, active, password_reset: Boolean(passwordHash) })]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    return formFailure(error, {
      fallback: "Could not save user. Please try again.",
      logLabel: "Could not save user",
      duplicate: { message: "An account with that email already exists.", field: "email" },
    });
  } finally {
    client.release();
  }
  revalidatePath("/users");
  return { success: id ? "User updated." : "User created." };
}
