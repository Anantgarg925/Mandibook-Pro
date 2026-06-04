-- Add agent tracking to inquiries
ALTER TABLE inquiries ADD COLUMN agent_purchase_amount NUMERIC DEFAULT 0;

-- Distinguish agents and buyers in the same table
ALTER TABLE buyers ADD COLUMN party_type TEXT DEFAULT 'BUYER';
