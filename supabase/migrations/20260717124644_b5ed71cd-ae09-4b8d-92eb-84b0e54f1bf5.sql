
CREATE TABLE public.gallery_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL,
  alt text,
  position integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gallery_images TO anon, authenticated;
GRANT ALL ON public.gallery_images TO service_role;
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active images"
  ON public.gallery_images FOR SELECT
  USING (active = true);
CREATE TRIGGER gallery_images_set_updated_at
  BEFORE UPDATE ON public.gallery_images
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Allow the service role (used by server functions to sign URLs) to read gallery objects.
-- The bucket stays private; images are served via signed URLs generated server-side.
CREATE POLICY "Service role can read gallery objects"
  ON storage.objects FOR SELECT
  TO service_role
  USING (bucket_id = 'gallery');

CREATE POLICY "Service role can write gallery objects"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'gallery')
  WITH CHECK (bucket_id = 'gallery');

-- Seed the new booking toggles.
INSERT INTO public.app_settings (key, value)
VALUES
  ('ask_children', 'true'::jsonb),
  ('ask_pets', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;
