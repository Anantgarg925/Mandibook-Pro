global.WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
  console.log('Fetching all buyers...');
  const { data: buyers, error: buyErr } = await supabase.from('buyers').select('id, name, code, outstanding_balance, shop_id');
  
  if (buyErr) {
    console.error('Error fetching buyers:', buyErr);
    return;
  }
  
  console.log('Fetching all transactions...');
  const { data: allTx, error: txErr } = await supabase.from('transactions').select('buyer_code, type, note, amount');

  if (txErr) {
    console.error('Error fetching transactions:', txErr);
    return;
  }

  console.log('Recalculating buyer balances...');
  
  const balanceMap = {};
  for (const tx of (allTx || [])) {
    if (tx.buyer_code === '__cashbook__') continue;

    if (!balanceMap[tx.buyer_code]) balanceMap[tx.buyer_code] = 0;
    
    const amt = Number(tx.amount || 0);
    
    if (tx.type === 'SALE' || tx.type === 'PAYMENT') {
      balanceMap[tx.buyer_code] += amt;
    } else if (tx.type === 'PURCHASE' || tx.type === 'RECEIPT' || tx.type === 'RETURN') {
      balanceMap[tx.buyer_code] -= amt;
    } else if (tx.type === 'OPENING') {
      if (tx.note === 'CR') balanceMap[tx.buyer_code] -= amt;
      else balanceMap[tx.buyer_code] += amt;
    }
  }

  let updatedBalances = 0;
  for (const buyer of buyers) {
    if (buyer.code === '__cashbook__') continue;
    
    const calculatedBal = balanceMap[buyer.code] || 0;
    
    if (Math.abs(Number(buyer.outstanding_balance) - calculatedBal) > 0.01) {
      console.log(`Fixing balance for ${buyer.name} (${buyer.code}) from ${buyer.outstanding_balance} to ${calculatedBal}`);
      await supabase.from('buyers').update({ outstanding_balance: calculatedBal }).eq('id', buyer.id);
      updatedBalances++;
    }
  }

  console.log(`Updated ${updatedBalances} buyer balances accurately.`);
}

fix();
