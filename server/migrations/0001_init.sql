-- Core schema. gen_random_uuid() is built into Postgres 13+, no extension needed.

CREATE TABLE doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Session tokens are stored hashed (scrypt, same as passwords): the cookie is the only place
-- the raw token exists, so a DB leak alone can't forge a session.
CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_doctor_id_idx ON sessions(doctor_id);

CREATE TABLE patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  mrn text NOT NULL,
  name text,
  sex text CHECK (sex IN ('M', 'F')),
  birth_year int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (doctor_id, mrn)
);

CREATE TABLE encounters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE, -- denormalised so every query can scope by doctor_id directly
  mode text NOT NULL CHECK (mode IN ('clinical', 'operative')),
  title text NOT NULL DEFAULT '',
  text text NOT NULL DEFAULT '',
  sheet jsonb NOT NULL DEFAULT '{}'::jsonb,
  open_bundles jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final')),
  bundles_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  finalized_at timestamptz
);
CREATE INDEX encounters_doctor_id_idx ON encounters(doctor_id);
CREATE INDEX encounters_patient_id_idx ON encounters(patient_id);

-- Flat mirror of encounters.sheet, rewritten wholesale on each save. Lets the dashboard's
-- "most missed fields" and patient trends run as plain SQL instead of scanning JSONB.
CREATE TABLE encounter_fields (
  encounter_id uuid NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  state text NOT NULL,
  source text NOT NULL,
  value text,
  unit text,
  PRIMARY KEY (encounter_id, field_key)
);
CREATE INDEX encounter_fields_doctor_field_idx ON encounter_fields(doctor_id, field_key);

CREATE TABLE audit_log (
  id bigserial PRIMARY KEY,
  doctor_id uuid REFERENCES doctors(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_doctor_id_idx ON audit_log(doctor_id);
