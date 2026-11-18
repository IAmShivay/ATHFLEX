CREATE TABLE IF NOT EXISTS material_tags (
  id serial PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('fabric','trim')),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120 AND name = btrim(name)),
  created_by integer NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS material_tags_kind_name_unique ON material_tags (kind, lower(name));
CREATE TABLE IF NOT EXISTS sku_material_tags (
  sku_id integer NOT NULL REFERENCES erp_skus(id) ON DELETE CASCADE,
  tag_id integer NOT NULL REFERENCES material_tags(id),
  assigned_by integer NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (sku_id, tag_id)
);
CREATE INDEX IF NOT EXISTS sku_material_tags_tag_idx ON sku_material_tags(tag_id);

ALTER TABLE techpack_files ALTER COLUMN content DROP NOT NULL;
ALTER TABLE techpack_files ADD COLUMN IF NOT EXISTS storage_backend text NOT NULL DEFAULT 'database';
ALTER TABLE techpack_files ADD COLUMN IF NOT EXISTS object_key text;
ALTER TABLE techpack_files ADD COLUMN IF NOT EXISTS object_bucket text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='techpack_files'::regclass AND conname='techpack_files_storage_check') THEN
    ALTER TABLE techpack_files ADD CONSTRAINT techpack_files_storage_check CHECK (
      (storage_backend='database' AND content IS NOT NULL AND object_key IS NULL AND object_bucket IS NULL) OR
      (storage_backend='r2' AND content IS NULL AND object_key IS NOT NULL AND object_bucket IS NOT NULL)
    );
  END IF;
END $$;
