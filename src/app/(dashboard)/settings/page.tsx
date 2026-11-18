import { getUser } from "@/lib/dal";
import { query } from "@/lib/db";
import { ProfileForm, PasswordForm, StoreInfoForm } from "@/components/SettingsForms";
import { hasPermission } from "@/lib/permissions";
import ShopifySettings from "@/components/ShopifySettings";

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const user = await getUser();
  const sp = await searchParams;
  const canEditStore = hasPermission(user, "store_settings");
  const { rows } = canEditStore ? await query<{
    store_name: string;
    store_email: string;
    currency: string;
    timezone: string;
  }>("SELECT store_name, store_email, currency, timezone FROM store_settings ORDER BY id LIMIT 1") : { rows: [] };
  const store = rows[0] ?? {
    store_name: "AthFlex",
    store_email: "support@athflex.com",
    currency: "USD",
    timezone: "Asia/Kolkata",
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[#1a1a1a]">Settings</h1>
        <p className="mt-0.5 text-sm text-[#616161]">Workspace, connections and account preferences</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {canEditStore && <section className="rounded-none border border-[#d4d4d4] bg-white p-5 shadow-none">
          <h2 className="mb-4 text-sm font-semibold text-[#1a1a1a]">Store details</h2>
          <StoreInfoForm initial={store} />
        </section>}

        <div className="space-y-4">
          <section className="rounded-none border border-[#d4d4d4] bg-white p-5 shadow-none">
            <h2 className="mb-4 text-sm font-semibold text-[#1a1a1a]">Profile</h2>
            <ProfileForm initial={{ name: user.name, email: user.email }} />
          </section>

          <section className="rounded-none border border-[#d4d4d4] bg-white p-5 shadow-none">
            <h2 className="mb-4 text-sm font-semibold text-[#1a1a1a]">Security</h2>
            <PasswordForm />
          </section>
        </div>
      </div>
      {hasPermission(user, "shopify") && <section id="shopify" className="scroll-mt-24 border-t border-neutral-300 pt-6"><ShopifySettings sp={sp} /></section>}
    </div>
  );
}
