-- Add preferred_payment_mode column to buyers table
ALTER TABLE public.buyers
ADD COLUMN preferred_payment_mode TEXT DEFAULT 'CASH' CHECK (preferred_payment_mode IN ('CASH', 'UPI', 'UDHAARI', 'CHEQUE', 'PENDING'));
