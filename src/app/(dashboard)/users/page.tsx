import { requireAdmin } from "@/lib/dal";
import { query } from "@/lib/db";
import UserForm, { type ManagedUser } from "@/components/UserForm";

export default async function UsersPage() {
  const actor = await requireAdmin();
  const { rows: users } = await query<ManagedUser>(
    "SELECT id, name, email, role, permissions, is_active FROM users ORDER BY name, id"
  );
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Users &amp; access</h1>
        <p className="mt-1 text-sm text-[#616161]">Create staff accounts and choose which parts of the dashboard they can use.</p>
      </div>
      <section className="rounded-none border border-[#d4d4d4] bg-white p-5 shadow-none">
        <h2 className="mb-4 font-semibold">Create a user</h2>
        <UserForm />
      </section>
      <section className="rounded-none border border-[#d4d4d4] bg-white p-5 shadow-none">
        <h2 className="mb-1 font-semibold">Existing users</h2>
        <p className="mb-3 text-xs text-[#737373]">Access changes and password resets sign out the affected user.</p>
        <div className="divide-y divide-[#d4d4d4]">
          {users.map((user) => (
            <div key={user.id} className="py-3">
              {user.id === actor.id ? (
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div><span className="font-medium">{user.name}</span> <span className="text-[#737373]">({user.email})</span></div>
                  <span className="text-xs text-[#737373]">Administrator · You</span>
                </div>
              ) : (
                <details>
                  <summary className="cursor-pointer text-sm"><span className="font-medium">{user.name}</span> <span className="text-[#737373]">({user.email}) · {user.role === "admin" ? "Administrator" : "Staff"} · {user.is_active ? "Active" : "Inactive"}</span></summary>
                  <div className="pt-4"><UserForm user={user} /></div>
                </details>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
