/*
# Company settings and admin display names

1. New Tables
- `company_settings`: a single row holding the company name and logo URL shown on the website chat and the admin dashboard.

2. Modified Tables
- `admin_emails`: new `display_name` column, the name an admin sees in the dashboard.

3. Storage
- New public bucket `company-assets` for logo images. Accepts PNG, JPEG and WebP up to 2 MB.

4. Security
- Everyone (visitors and signed-in users) can read company settings, since the public chat shows them.
- Only listed admins can change the company name and logo.
- Admins can read and change only their own display name. Their email cannot be changed.
- Only listed admins can upload, replace or remove logo files.

5. Important notes
- Safe to re-run.
*/

CREATE TABLE IF NOT EXISTS public.company_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  company_name text NOT NULL CHECK (char_length(btrim(company_name)) BETWEEN 1 AND 80),
  logo_url text
);

INSERT INTO public.company_settings (id, company_name)
VALUES (1, 'CupidCreativeX')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.company_settings FROM anon, authenticated;
GRANT SELECT ON public.company_settings TO anon, authenticated;
GRANT UPDATE (company_name, logo_url) ON public.company_settings TO authenticated;

DROP POLICY IF EXISTS "public_read_company_settings" ON public.company_settings;
CREATE POLICY "public_read_company_settings" ON public.company_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_update_company_settings" ON public.company_settings;
CREATE POLICY "admin_update_company_settings" ON public.company_settings FOR UPDATE
  TO authenticated USING (public.is_lead_admin()) WITH CHECK (public.is_lead_admin());

ALTER TABLE public.admin_emails
  ADD COLUMN IF NOT EXISTS display_name text NOT NULL DEFAULT ''
  CHECK (char_length(display_name) <= 60);

GRANT SELECT ON public.admin_emails TO authenticated;
GRANT UPDATE (display_name) ON public.admin_emails TO authenticated;

DROP POLICY IF EXISTS "admin_select_own_row" ON public.admin_emails;
CREATE POLICY "admin_select_own_row" ON public.admin_emails FOR SELECT
  TO authenticated USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

DROP POLICY IF EXISTS "admin_update_own_name" ON public.admin_emails;
CREATE POLICY "admin_update_own_name" ON public.admin_emails FOR UPDATE
  TO authenticated
  USING (public.is_lead_admin() AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  WITH CHECK (public.is_lead_admin() AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('company-assets', 'company-assets', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "admin_insert_company_assets" ON storage.objects;
CREATE POLICY "admin_insert_company_assets" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'company-assets' AND public.is_lead_admin());

DROP POLICY IF EXISTS "admin_update_company_assets" ON storage.objects;
CREATE POLICY "admin_update_company_assets" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'company-assets' AND public.is_lead_admin())
  WITH CHECK (bucket_id = 'company-assets' AND public.is_lead_admin());

DROP POLICY IF EXISTS "admin_delete_company_assets" ON storage.objects;
CREATE POLICY "admin_delete_company_assets" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'company-assets' AND public.is_lead_admin());
