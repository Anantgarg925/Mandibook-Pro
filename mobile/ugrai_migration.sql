CREATE TABLE IF NOT EXISTS ugrai_collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id TEXT NOT NULL,
  buyer_code TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  member_id TEXT NOT NULL,
  member_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'PENDING',
  created_at BIGINT NOT NULL
);

ALTER TABLE ugrai_collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for ugrai_collections" ON ugrai_collections;

CREATE POLICY "Enable all access for ugrai_collections" 
  ON ugrai_collections 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);
