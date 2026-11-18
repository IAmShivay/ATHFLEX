CREATE TABLE IF NOT EXISTS techpacks (
  id serial PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL,
  director_id integer NOT NULL REFERENCES users(id),
  designer_id integer NOT NULL REFERENCES users(id),
  created_month date NOT NULL,
  season text NOT NULL,
  theme text NOT NULL,
  brand_sku text,
  order_type text NOT NULL,
  key_features text,
  fabric_details text,
  color_family text NOT NULL,
  tpg_code text NOT NULL,
  target_cost numeric(12, 2),
  dropbox_url text,
  description text,
  d2c_exclusive boolean NOT NULL DEFAULT false,
  neck_type text,
  size_type text,
  collection_type text,
  remarks text,
  created_by integer NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS techpacks_code_lower_unique ON techpacks (lower(code));

CREATE TABLE IF NOT EXISTS erp_skus (
  id serial PRIMARY KEY,
  techpack_id integer NOT NULL REFERENCES techpacks(id) ON DELETE CASCADE,
  sku text NOT NULL,
  product_name text NOT NULL,
  color text NOT NULL,
  size text NOT NULL,
  shopify_store_domain text,
  shopify_product_id text,
  shopify_variant_id text,
  shopify_product_name text,
  shopify_variant_name text,
  shopify_sku text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT erp_shopify_mapping_complete CHECK ((shopify_product_id IS NULL) = (shopify_variant_id IS NULL) AND (shopify_product_id IS NULL) = (shopify_store_domain IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS erp_skus_sku_lower_unique ON erp_skus (lower(sku));
CREATE UNIQUE INDEX IF NOT EXISTS erp_skus_shopify_variant_unique ON erp_skus (shopify_store_domain, shopify_variant_id) WHERE shopify_variant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS erp_skus_techpack_idx ON erp_skus (techpack_id);

CREATE TABLE IF NOT EXISTS techpack_files (
  id serial PRIMARY KEY,
  techpack_id integer NOT NULL REFERENCES techpacks(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('front','back','size_chart','other')),
  original_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 5242880),
  content bytea NOT NULL,
  uploaded_by integer NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS techpack_files_techpack_idx ON techpack_files (techpack_id);
