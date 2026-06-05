-- Add agent tracking to inquiries
ALTER TABLE inquiries ADD COLUMN agent_purchase_amount NUMERIC DEFAULT 0;

-- Distinguish agents and buyers in the same table
ALTER TABLE buyers ADD COLUMN party_type TEXT DEFAULT 'BUYER';

-- Allow PURCHASE transaction type in the transactions table
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check CHECK (type IN ('SALE', 'PAYMENT', 'OPENING', 'PURCHASE'));

