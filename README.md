# AthFlex Dashboard

Product development ERP built with Next.js 16, Tailwind CSS v4, and PostgreSQL. Shopify is a product-sync connection managed in Settings.

The interface uses a minimal monochrome design: square corners, crisp one-pixel borders, white surfaces, black primary actions, neutral gray text, and labeled status states. Keep new sections consistent with the shared colors and zero-radius tokens in `src/app/globals.css`. Product photography retains its original colors. Long forms use section navigation and a persistent action bar.

## Features

- **Auth and access** — email/password login, administrator-managed staff accounts, per-area permissions and session revocation
- **Home** — the Phase 1 workflow tracker with live counts, tech pack and SKU totals, recent styles, and outstanding setup
- **SKU / Product master** — the common SKU list with style, PP status, fabric and trims, plus the Shopify catalog; searchable
- **Material masters** — shared Fabric and Trim lists with usage counts
- **PP approval** — queue of samples awaiting approval, in rework, or approved
- **Tech packs** — style details, size/color ERP SKUs, optional Shopify variant mappings, and protected attachments
- **Production (Phase 1)** — PP sample gate, jobber master and rates, FOB POs, piece QR sheets, inward scanning with a manual fallback, and production reports
- **Analytics** — ERP SKU coverage, material assignments, and product mapping progress
- **Settings** — workspace details, Shopify connection and product sync, profile, password change

## Setup

```bash
npm install
# Create .env.local with the variables below
npm run seed                       # demo databases only: replaces existing data
npm run migrate:access             # add user access fields without replacing data
npm run migrate:techpacks          # add tech pack, SKU, and attachment tables
npm run migrate:materials          # add reusable materials and storage metadata
npm run migrate:production         # add PP approval, jobbers, FOB POs, QR pieces, and inward scans
npm run migrate:architecture       # add PP rework rounds and the PO source (manual or forecast)
npm run dev
```

The demo seed creates `admin@athflex.com` / `admin123`. Change that password in Settings before sharing access. **The seed script truncates existing users, products, customers, orders, and settings; do not run it against data you want to keep.**

## Phases and architecture

The navigation is driven by one registry, `src/lib/navigation.ts`. Each module is `live` or `planned`, belongs to a phase group, and carries its own permission. Adding a Phase 2 module means changing its `status` to `live`, adding its route and a permission; Phase 1 is not rebuilt.

**Phase 1: product development and manufacturing execution (live)**

- Dashboard with the workflow tracker
- Sidebar tabs follow the Phase 1 flow order: Tech packs, Fabric master, Trim master, SKU / Product master, Jobbers, PP approval, FOB POs, QR & Inward, Reports and Analytics

The workflow is Techpack → Fabric master → Trim master → SKU generation → PP approval → FOB PO → QR generation → jobber prints and sticks the QR → scan inward → reports. A rejected PP sample goes to rework and is resubmitted for a new decision (`pp_rework_count` records each round). The tracker on the dashboard and on every tech pack is defined in `src/lib/workflow.ts`.

**Phase 2: demand planning and inventory (reserved)**

E-commerce integration, Inventory management, Demand forecasting, Product planning and Purchase planning are defined in the navigation registry as planned modules with a landing page each. They are hidden until `SHOW_PLANNED_MODULES` in `src/lib/navigation.ts` is set to `true`. The intended flow is E-commerce data → Inventory → Demand forecasting → Product planning → Purchase planning → PO creation.

**One shared core.** There is one SKU master (`erp_skus`), one PO system (`fob_pos` and its items and pieces) and one manufacturing execution flow (QR pieces, inward scans, reports). A PO can be raised two ways, recorded in `fob_pos.source`:

- `manual`: created in Phase 1 from the FOB PO screen
- `forecast`: created by the future Purchase planning module, with `source_ref` pointing at the plan it came from

Both routes feed the same QR sheet, inward scanning and reports, so Phase 2 only has to create POs, not rebuild anything downstream. Run `npm run migrate:architecture` before deploying this version.

## User access

Run `npm run migrate:access` once against the target database before starting this version. It is safe to rerun and preserves existing users and data. It requires an existing active `admin` account and fails without making changes if email addresses differ only in case. The migration uses the same `.env` files as Next.js; set `NODE_ENV=production` when targeting a production environment. All existing sessions must sign in again after this update.

Administrators can use **Users & access** to create accounts, choose staff permissions, reset passwords, and deactivate accounts. Administrators always have full access, including user management. Staff can always change their own profile and password. Home and Analytics contain ERP summaries; Shopify connection access controls the integration section in Settings. Orders and Customers are not exposed as modules. Changes to permissions or account status, and password resets, sign out affected users. At least one active administrator must remain. Administrators cannot change their own access; another administrator must do so. Account changes are recorded in the `user_access_audit` table.

New and reset passwords must have 12–256 characters. Share initial passwords securely and ask users to change them in Settings. Set a unique, random `SESSION_SECRET` of at least 32 characters in production.

## Tech packs and ERP SKUs

Run `npm run migrate:techpacks` after `npm run migrate:access` before using the tech pack section. The migration is transactional and can be rerun. Grant staff **Tech packs — view** or **Tech packs — manage** in Users & access. Manage access includes viewing, creating, editing, uploading files and mapping Shopify variants.

Each tech pack stores its own style details and generates a separate ERP SKU for every color and size, in `BASE-COLOR-SIZE` format. The base is the brand SKU if supplied, otherwise the tech pack code. Codes and base SKUs are fixed after creation; more combinations can be added later. Shopify mappings store the store, product and variant IDs along with name and SKU snapshots. They do not create or change Shopify products. Attachments are downloaded only by authorized tech pack users and limited to PDF, JPG, PNG, WebP or XLSX, up to 5 MB per file and 15 MB per submission. Product photos have previews before saving and in the tech pack gallery.

After creating a tech pack, use **Fabric & trims** to create reusable tags and assign them to one SKU, all sizes of a color, or the whole tech pack. Names are unique within fabric or trim, ignoring case and repeated whitespace. Applying tags adds to existing assignments; removing an assignment keeps the tag available for reuse. View-only users can read assignments, while managing them requires Tech packs — manage.

## Production flow (Phase 1)

Run `npm run migrate:production` after the earlier migrations. It adds PP approval fields, jobbers, tech pack jobber rates, FOB POs, pre-generated piece QR records and inward scans. The migration is transactional and can be rerun.

The flow is: tech pack and fabric/trim setup → generated ERP sizes → PP sample approval → FOB PO with a jobber → piece QR sheet → inward scanning → reports. The gate is enforced in the database actions: a style can only be selected for a FOB PO when its PP sample is approved, and the selected jobber must be assigned to that style with a rate.

- **PP sample approval** — requires **PP sample approval** access. Pending or rejected styles stay locked out of the new-PO picker. A style on a draft, issued or partly received PO cannot be reset or rejected until that PO is closed or cancelled.
- **Jobbers** — **FOB POs — view** can see the jobber master; **FOB POs — manage** can add or deactivate jobbers. Rates and operation types are assigned per style on the tech pack detail page.
- **FOB POs** — **FOB POs — manage** creates and issues POs. Statuses are draft, issued, partly received, closed and cancelled. Quantities are entered per generated size. Only an issued or partly received PO can receive pieces. Closing with pieces still pending records a shortfall in reports. A PO with scans cannot be cancelled.
- **QR sheets** — issuing a PO unlocks a print sheet at `/print/purchase-orders/{id}/qr`. Every ordered piece has a stable code in the form `FOB-0042_AF1023-Black-Jogger_M_001`. Codes can be reprinted without creating new pieces.
- **Inward** — **Inward scanning** access covers the USB/keyboard-wedge scan page and the separate manual-entry fallback. A piece can be received once only, and manual numbers must belong to the selected PO and style. Manual receipts are labeled separately. A PO closes automatically when the last piece is received.
- **Delivery dates** — a delivery date can be revised while a PO is open. The original date stays on the line and on-time reporting continues to use it; pending and overdue use the current date.
- **Reports** — **Production reports** access shows lead time, jobber on-time delivery, late jobber ranking, pending/overdue quantities, overall receipt totals and separate manual-entry counts.

## File storage and Cloudflare R2

Uploads stay in PostgreSQL while R2 is unconfigured. To switch **new uploads** to a private R2 bucket later, set these server-only variables in `.env.local` and in the deployed application's environment, then restart:

```env
R2_ACCOUNT_ID=
R2_BUCKET_NAME=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
```

The R2 credentials must allow reading and writing objects in that bucket. Files are served through authenticated application routes, so a public bucket and browser CORS configuration are not required. Existing database uploads remain readable after connecting R2. Partial settings or a failed R2 upload cause an error rather than silently falling back to the database. New R2 objects are cleaned up if their database save fails before commit. Run `npm run test:storage` for storage contract tests with a mocked S3 transport; a real bucket still needs a connection test when credentials are supplied.

## Environment

```env
DATABASE_URL=postgres://...
SESSION_SECRET=<random 64-hex>

# Optional: trust a private CA and verify the certificate name for PostgreSQL
DATABASE_CA_CERT_PATH=path/to/ca.pem
DATABASE_TLS_SERVERNAME=database-certificate-name

# Public origin of this deployment (fixes redirects behind proxies like Coolify)
APP_URL=https://dashboard.athflex.in

SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_CLIENT_ID=
SHOPIFY_CLIENT_SECRET=
# Optional: skip OAuth by pasting an Admin API access token (shpat_...)
SHOPIFY_ADMIN_ACCESS_TOKEN=
# Must exactly match the redirect URI whitelisted in your Shopify app config
SHOPIFY_REDIRECT_URI=
```

When supplying `DATABASE_CA_CERT_PATH`, omit `sslmode` from `DATABASE_URL` so the PostgreSQL client uses the configured CA and verifies the server certificate. `DATABASE_TLS_SERVERNAME` is useful when connecting by IP to a certificate issued for a DNS name. Keep the CA file and connection credentials out of version control.

## Shopify OAuth

Whitelist in Partner Dashboard → App setup → URLs:

- `http://localhost:3000/api/shopify/callback` (local)
- `https://your-domain/api/shopify/callback` (production — also set `SHOPIFY_REDIRECT_URI` to this)

Then open **Settings → Shopify** and click **Connect**. The access token is stored in the `shopify_tokens` table. Previous `/shopify` links redirect to the connection section in Settings.

## Production

```bash
npm install
npm run build
npm start
```
