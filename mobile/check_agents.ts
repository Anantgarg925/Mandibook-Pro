import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'unknown',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'unknown'
);

async function main() {
  const { data, error } = await supabase.from('agents').select('*').limit(1);
  console.log('Agents data:', data);
  console.log('Agents error:', error);
}

main();
