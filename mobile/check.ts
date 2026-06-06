import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://peadfqedoxgmrlasnxju.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlYWRmcWVkb3hnbXJsYXNueGp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MzMwNDcsImV4cCI6MjA5NDAwOTA0N30.Vch6t6RkDBx4fPFXFVaqZ0uR8N-ML-VM6nnQd-xmdGw'
);

async function run() {
  const { data, error } = await supabase
    .from('inquiries')
    .select('id, slip_number, gross_amount, apmc_amount, bardana_amount, cartage_amount, net_amount')
    .gt('cartage_amount', 0);
    
  let brokenCount = 0;
  if (data) {
    for (const d of data) {
      if (Math.abs(d.net_amount - (d.gross_amount + d.apmc_amount + d.bardana_amount)) > 1) {
        brokenCount++;
        console.log(`Still broken: ${d.slip_number} (net: ${d.net_amount}, expected: ${d.gross_amount + d.apmc_amount + d.bardana_amount})`);
      }
    }
  }
  console.log(`Total broken remaining: ${brokenCount}`);
}

run();
