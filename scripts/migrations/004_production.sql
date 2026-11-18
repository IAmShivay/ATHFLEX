-- Phase 1 production flow: PP approval, jobber rates, FOB POs, piece QR codes and inward scans.

ALTER TABLE techpacks ADD COLUMN IF NOT EXISTS pp_status text NOT NULL DEFAULT 'pending';
ALTER TABLE techpacks ADD COLUMN IF NOT EXISTS pp_notes text;
ALTER TABLE techpacks ADD COLUMN IF NOT EXISTS pp_submitted_at timestamptz;
ALTER TABLE techpacks ADD COLUMN IF NOT EXISTS pp_decided_at timestamptz;
ALTER TABLE techpacks ADD COLUMN IF NOT EXISTS pp_decided_by integer REFERENCES users(id) ON DELETE SET NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'techpacks'::regclass AND conname = 'techpacks_pp_status_check') THEN
    ALTER TABLE techpacks ADD CONSTRAINT techpacks_pp_status_check
      CHECK (pp_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS techpacks_pp_status_idx ON techpacks (pp_status);

CREATE TABLE IF NOT EXISTS jobbers (
  id serial PRIMARY KEY,
  name text NOT NULL,
  contact_name text,
  phone text,
  email text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT jobbers_name_check CHECK (char_length(name) BETWEEN 1 AND 120 AND name = btrim(name))
);
CREATE UNIQUE INDEX IF NOT EXISTS jobbers_name_lower_unique ON jobbers (lower(name));

CREATE TABLE IF NOT EXISTS techpack_jobbers (
  techpack_id integer NOT NULL REFERENCES techpacks(id) ON DELETE CASCADE,
  jobber_id integer NOT NULL REFERENCES jobbers(id),
  rate numeric(12, 2) NOT NULL,
  operation_type text NOT NULL,
  created_by integer NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (techpack_id, jobber_id),
  CONSTRAINT techpack_jobbers_rate_check CHECK (rate >= 0),
  CONSTRAINT techpack_jobbers_operation_check CHECK (char_length(operation_type) BETWEEN 1 AND 120)
);
CREATE INDEX IF NOT EXISTS techpack_jobbers_jobber_idx ON techpack_jobbers (jobber_id);

CREATE SEQUENCE IF NOT EXISTS fob_po_number_seq START WITH 1;

CREATE TABLE IF NOT EXISTS fob_pos (
  id serial PRIMARY KEY,
  po_number text NOT NULL UNIQUE,
  jobber_id integer NOT NULL REFERENCES jobbers(id),
  status text NOT NULL DEFAULT 'draft',
  po_date date NOT NULL DEFAULT current_date,
  notes text,
  issued_at timestamptz,
  closed_at timestamptz,
  closed_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_by integer NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fob_pos_status_check CHECK (status IN ('draft', 'issued', 'partly_received', 'closed', 'cancelled'))
);
CREATE INDEX IF NOT EXISTS fob_pos_jobber_idx ON fob_pos (jobber_id);
CREATE INDEX IF NOT EXISTS fob_pos_status_idx ON fob_pos (status);
CREATE INDEX IF NOT EXISTS fob_pos_po_date_idx ON fob_pos (po_date);

CREATE TABLE IF NOT EXISTS fob_po_items (
  id serial PRIMARY KEY,
  fob_po_id integer NOT NULL REFERENCES fob_pos(id) ON DELETE CASCADE,
  techpack_id integer NOT NULL REFERENCES techpacks(id),
  size text NOT NULL,
  quantity integer NOT NULL,
  delivery_date date NOT NULL,
  original_delivery_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fob_po_items_quantity_check CHECK (quantity BETWEEN 1 AND 10000),
  CONSTRAINT fob_po_items_size_check CHECK (char_length(size) BETWEEN 1 AND 40),
  CONSTRAINT fob_po_items_unique_line UNIQUE (fob_po_id, techpack_id, size)
);
CREATE INDEX IF NOT EXISTS fob_po_items_techpack_idx ON fob_po_items (techpack_id);
CREATE INDEX IF NOT EXISTS fob_po_items_delivery_idx ON fob_po_items (delivery_date);

CREATE TABLE IF NOT EXISTS fob_pieces (
  id bigserial PRIMARY KEY,
  item_id integer NOT NULL REFERENCES fob_po_items(id) ON DELETE CASCADE,
  piece_no integer NOT NULL,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  scanned_at timestamptz,
  scanned_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fob_pieces_piece_no_check CHECK (piece_no > 0),
  CONSTRAINT fob_pieces_status_check CHECK (status IN ('pending', 'scanned', 'manual')),
  CONSTRAINT fob_pieces_item_piece_unique UNIQUE (item_id, piece_no)
);
CREATE UNIQUE INDEX IF NOT EXISTS fob_pieces_code_lower_unique ON fob_pieces (lower(code));
CREATE INDEX IF NOT EXISTS fob_pieces_item_idx ON fob_pieces (item_id);
CREATE INDEX IF NOT EXISTS fob_pieces_status_idx ON fob_pieces (status);

CREATE TABLE IF NOT EXISTS inward_scans (
  id bigserial PRIMARY KEY,
  piece_id bigint NOT NULL REFERENCES fob_pieces(id) ON DELETE CASCADE,
  fob_po_id integer NOT NULL REFERENCES fob_pos(id) ON DELETE CASCADE,
  item_id integer NOT NULL REFERENCES fob_po_items(id) ON DELETE CASCADE,
  entry_type text NOT NULL,
  scanned_by integer NOT NULL REFERENCES users(id),
  scanned_at timestamptz NOT NULL DEFAULT now(),
  note text,
  CONSTRAINT inward_scans_entry_type_check CHECK (entry_type IN ('scanned', 'manual')),
  CONSTRAINT inward_scans_piece_unique UNIQUE (piece_id)
);
CREATE INDEX IF NOT EXISTS inward_scans_po_idx ON inward_scans (fob_po_id);
CREATE INDEX IF NOT EXISTS inward_scans_item_idx ON inward_scans (item_id);
CREATE INDEX IF NOT EXISTS inward_scans_scanned_at_idx ON inward_scans (scanned_at);
