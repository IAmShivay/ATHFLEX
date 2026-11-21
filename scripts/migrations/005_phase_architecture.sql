-- Phase architecture: PP rework rounds and PO source so Phase 2 (forecast-based) POs share the same flow.

ALTER TABLE techpacks ADD COLUMN IF NOT EXISTS pp_rework_count integer NOT NULL DEFAULT 0;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'techpacks'::regclass AND conname = 'techpacks_pp_rework_count_check') THEN
    ALTER TABLE techpacks ADD CONSTRAINT techpacks_pp_rework_count_check CHECK (pp_rework_count >= 0);
  END IF;
END $$;

ALTER TABLE fob_pos ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';
ALTER TABLE fob_pos ADD COLUMN IF NOT EXISTS source_ref text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'fob_pos'::regclass AND conname = 'fob_pos_source_check') THEN
    ALTER TABLE fob_pos ADD CONSTRAINT fob_pos_source_check CHECK (source IN ('manual', 'forecast'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'fob_pos'::regclass AND conname = 'fob_pos_source_ref_check') THEN
    ALTER TABLE fob_pos ADD CONSTRAINT fob_pos_source_ref_check CHECK (source_ref IS NULL OR char_length(source_ref) BETWEEN 1 AND 120);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS fob_pos_source_idx ON fob_pos (source);
