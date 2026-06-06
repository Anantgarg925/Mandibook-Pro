import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://peadfqedoxgmrlasnxju.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlYWRmcWVkb3hnbXJsYXNueGp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MzMwNDcsImV4cCI6MjA5NDAwOTA0N30.Vch6t6RkDBx4fPFXFVaqZ0uR8N-ML-VM6nnQd-xmdGw'
);

async function run() {
  const { data } = await supabase.from('inquiries').select('*').eq('slip_number', 1123).single();
  console.log(JSON.stringify(data.charge_snapshot, null, 2));
}

run();
