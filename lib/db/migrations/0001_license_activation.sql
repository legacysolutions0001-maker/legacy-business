-- License & activation fields for lb_companies
ALTER TABLE "lb_companies" ADD COLUMN IF NOT EXISTS "license_key" text UNIQUE;
ALTER TABLE "lb_companies" ADD COLUMN IF NOT EXISTS "max_users" integer NOT NULL DEFAULT 5;
ALTER TABLE "lb_companies" ADD COLUMN IF NOT EXISTS "max_devices" integer NOT NULL DEFAULT 1;
ALTER TABLE "lb_companies" ADD COLUMN IF NOT EXISTS "max_branches" integer NOT NULL DEFAULT 1;
ALTER TABLE "lb_companies" ADD COLUMN IF NOT EXISTS "activation_status" text NOT NULL DEFAULT 'pending';
ALTER TABLE "lb_companies" ADD COLUMN IF NOT EXISTS "firebase_id" text;

-- Activated devices table for device-limit enforcement
CREATE TABLE IF NOT EXISTS "lb_activated_devices" (
  "id" serial PRIMARY KEY NOT NULL,
  "company_id" integer NOT NULL,
  "device_id" text NOT NULL,
  "device_name" text,
  "device_os" text,
  "last_seen" timestamp with time zone DEFAULT now() NOT NULL,
  "is_active" integer NOT NULL DEFAULT 1,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
