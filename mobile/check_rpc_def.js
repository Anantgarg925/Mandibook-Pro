global.WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_KEY);

async function check() {
  const { data, error } = await supabase.rpc('get_schema_info'); // No wait, let's just grep the local supabase migrations!
}
check();
