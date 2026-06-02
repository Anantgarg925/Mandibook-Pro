-- Add payment_received_by column to inquiries table for tracking member attribution

ALTER TABLE inquiries
ADD COLUMN IF NOT EXISTS payment_received_by TEXT;

-- We also need to reload schema cache on the server, which db push usually does automatically.
-- NOTE: We also added paymentReceivedBy in the TypeScript types.
