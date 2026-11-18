import { getUser } from "@/lib/dal";
import { query } from "@/lib/db";
import Sidebar, { MobileNav } from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

async function getStoreName(): Promise<string> {
  try {
    const { rows } = await query<{ store_name: string }>(
      "SELECT store_name FROM store_settings ORDER BY id LIMIT 1"
    );
    return rows[0]?.store_name ?? "AthFlex";
  } catch {
    return "AthFlex";
  }
}

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const [user, storeName] = await Promise.all([getUser(), getStoreName()]);

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <Sidebar user={user} storeName={storeName} />
      <div className="flex min-h-screen flex-col lg:pl-60">
        <Topbar user={user} storeName={storeName} />
        <MobileNav user={user} />
        <main className="mx-auto w-full max-w-7xl flex-1 p-5 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
