import { disconnectShopify, syncShopifyProducts } from "@/app/actions/shopify";
import { getAccessToken, oauthConfigured, storeDomain } from "@/lib/shopify";
import ActionButton from "@/components/ActionButton";
import { ShopifyIcon } from "@/components/icons";

const ERRORS: Record<string, string> = {
  not_configured: "Shopify client ID / secret / store domain are not set in .env.local yet.",
  state_mismatch: "OAuth state mismatch — the connection attempt was rejected. Please try again.",
  invalid_callback: "Shopify could not verify the connection response. Please reconnect the store.",
  token_exchange: "Could not exchange the OAuth code for an access token. Check your client secret.",
  save_failed: "Connected, but saving the token to Postgres failed.",
};

export default async function ShopifySettings({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const error = typeof sp.error === "string" ? sp.error : null;
  const connected = sp.connected === "1";
  const synced = typeof sp.synced === "string" ? sp.synced : null;
  const disconnected = sp.disconnected === "1";

  const domain = storeDomain();
  const configured = oauthConfigured();
  const token = await getAccessToken();

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-[#1a1a1a]">
          <span className="flex h-8 w-8 items-center justify-center rounded-none bg-[#171717]/15 text-[#404040]">
            <ShopifyIcon className="h-5 w-5" />
          </span>
          Shopify
        </h2>
        <p className="mt-0.5 text-sm text-[#616161]">
          {domain ? (
            <>
              Store: <span className="font-medium text-[#1a1a1a]">{domain}</span>
            </>
          ) : (
            "Admin API connection"
          )}
        </p>
      </div>
    </div>
  );

  if (!configured && !token) {
    return (
      <div className="space-y-4">
        {header}
        <div className="rounded-none border border-[#d4d4d4] bg-white p-6 shadow-none">
          <h2 className="text-base font-semibold text-[#1a1a1a]">Connect your Shopify store</h2>
          <p className="mt-1 max-w-2xl text-sm text-[#616161]">
            Create a custom app in your Shopify Partner Dashboard (or store admin) with the
            <span className="font-medium text-[#1a1a1a]"> read_products, write_products</span> scopes, then fill
            these values in <code className="rounded-none bg-[#f7f7f7] px-1 py-0.5 text-xs">.env.local</code> and
            restart the server:
          </p>
          <ul className="mt-4 space-y-2 rounded-none bg-[#fafafa] p-4 font-mono text-xs text-[#4a4a4a]">
            <li>SHOPIFY_STORE_DOMAIN=your-store.myshopify.com</li>
            <li>SHOPIFY_CLIENT_ID=…</li>
            <li>SHOPIFY_CLIENT_SECRET=…</li>
            <li className="text-[#737373]"># optional: paste an Admin API access token instead of OAuth</li>
            <li>SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_…</li>
          </ul>
          <p className="mt-4 text-sm text-[#616161]">
            Whitelist this redirect URI in the app config:
            <code className="ml-1.5 rounded-none bg-[#f7f7f7] px-1.5 py-0.5 text-xs">
              http://localhost:3000/api/shopify/callback
            </code>
          </p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="space-y-4">
        {header}
        {error && ERRORS[error] && (
          <p className="rounded-none bg-neutral-50 px-3 py-2 text-sm text-neutral-700 ring-1 ring-inset ring-neutral-600/10">
            {ERRORS[error]}
          </p>
        )}
        <div className="rounded-none border border-[#d4d4d4] bg-white p-6 shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-[#1a1a1a]">Not connected</h2>
              <p className="mt-1 max-w-xl text-sm text-[#616161]">
                Authorize this dashboard to read products from {domain} via the Shopify Admin API. You&apos;ll be
                redirected to Shopify and back.
              </p>
            </div>
            <a
              href="/api/shopify/connect"
              className="rounded-none bg-[#171717] px-4 py-2.5 text-sm font-semibold text-white shadow-none transition-colors hover:bg-neutral-800"
            >
              Connect {domain?.split(".")[0]}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {header}

      {error && ERRORS[error] && (
        <p className="rounded-none bg-neutral-50 px-3 py-2 text-sm text-neutral-700 ring-1 ring-inset ring-neutral-600/10">
          {ERRORS[error]}
        </p>
      )}
      {connected && (
        <p className="rounded-none bg-neutral-50 px-3 py-2 text-sm text-neutral-700 ring-1 ring-inset ring-neutral-600/10">
          Shopify store connected successfully.
        </p>
      )}
      {synced && /^\d+$/.test(synced) && (
        <p className="rounded-none bg-neutral-50 px-3 py-2 text-sm text-neutral-700 ring-1 ring-inset ring-neutral-600/10">
          Synced {synced} Shopify products into your local catalog.
        </p>
      )}
      {disconnected && (
        <p className="rounded-none bg-neutral-100 px-3 py-2 text-sm text-neutral-700 ring-1 ring-inset ring-neutral-500/20">
          Shopify disconnected. Stored tokens removed.
        </p>
      )}

      <div className="rounded-none border border-[#d4d4d4] bg-white p-6 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-none bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-700 ring-1 ring-inset ring-neutral-600/20">
              <span className="h-1.5 w-1.5 rounded-none bg-neutral-500" />
              Connected · {token.source === "env" ? "token from env" : "token from OAuth"}
            </span>
            <p className="text-sm text-[#616161]">
              Product details are available in Products. Sync refreshes the local catalog used by this workspace.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <form action={syncShopifyProducts}>
              <ActionButton
                pendingLabel="Syncing…"
                className="rounded-none bg-neutral-700 px-4 py-2 text-sm font-semibold text-white shadow-none transition-colors hover:bg-neutral-800"
              >
                Sync to local catalog
              </ActionButton>
            </form>
            <form action={disconnectShopify}>
              <ActionButton
                pendingLabel="Disconnecting…"
                className="rounded-none border border-[#d4d4d4] bg-white px-4 py-2 text-sm font-medium text-[#4a4a4a] shadow-none transition-colors hover:bg-[#fafafa]"
              >
                Disconnect
              </ActionButton>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
