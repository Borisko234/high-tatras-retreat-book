DROP POLICY IF EXISTS "Anyone reads settings" ON public.app_settings;
CREATE POLICY "Anyone reads public settings"
  ON public.app_settings
  FOR SELECT
  TO anon, authenticated
  USING (key IN ('base_nightly_price', 'contact_email', 'contact_phone'));