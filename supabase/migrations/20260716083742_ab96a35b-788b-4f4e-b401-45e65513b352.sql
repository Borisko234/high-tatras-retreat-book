
-- Add guest breakdown + payment tracking to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS adults_count integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS children_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pets_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS deposit_amount numeric;

-- Add color + optional label to manual blocks
ALTER TABLE public.manual_blocks
  ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '#94a3b8';
