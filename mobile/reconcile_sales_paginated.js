global.WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_KEY);

async function fetchAll(table, select, match) {
  let allData = [];
  let from = 0;
  const step = 1000;
  while (true) {
    let q = supabase.from(table).select(select).range(from, from + step - 1);
    if (match) q = q.match(match);
    const { data, error } = await q;
    if (error) throw error;
    allData = allData.concat(data);
    if (data.length < step) break;
    from += step;
  }
  return allData;
}

async function fix() {
  console.log('Fetching all inquiries...');
  const inqs = await fetchAll('inquiries', '*', { status: 'CONFIRMED' });
  console.log(`Fetched ${inqs.length} inquiries.`);
  
  console.log('Fetching all transactions...');
  const txs = await fetchAll('transactions', '*', {});
  console.log(`Fetched ${txs.length} transactions.`);
  
  const buyers = await fetchAll('buyers', 'code, name, phone, party_type', {});
  const buyerMap = {};
  for (const b of buyers) {
    const key = (b.name || '').trim().toLowerCase();
    buyerMap[key] = b.code;
  }
  
  const getBuyerCode = (name) => {
    return buyerMap[(name || '').trim().toLowerCase()];
  };

  const toDelete = [];
  const validTxIds = new Set();
  
  let fixed = 0;

  for (const inq of inqs) {
    if (inq.payment_mode === 'CASH' || inq.payment_mode === 'UPI') continue;
    
    const bCode = getBuyerCode(inq.customer_name);
    if (!bCode) continue;

    // Find the actual transaction for this bill. First try exactly matching buyer code, then just slip number
    const exactTxs = txs.filter(t => t.slip_number === inq.slip_number && t.type === 'SALE' && t.buyer_code === bCode);
    
    if (exactTxs.length > 0) {
      // Keep the most recent one if there are duplicates
      exactTxs.sort((a, b) => b.created_at - a.created_at);
      const keepTx = exactTxs[0];
      validTxIds.add(keepTx.id);
      
      // Delete the duplicates
      for (let i = 1; i < exactTxs.length; i++) {
        toDelete.push(exactTxs[i].id);
      }
      
      // Update amount if wrong
      if (Math.abs(Number(keepTx.amount) - Number(inq.net_amount)) > 0.1) {
        await supabase.from('transactions').update({ amount: inq.net_amount }).eq('id', keepTx.id);
        fixed++;
      }
    } else {
      // Find ANY orphaned transaction with this slip number
      const orphanedTxs = txs.filter(t => t.slip_number === inq.slip_number && t.type === 'SALE' && !validTxIds.has(t.id));
      if (orphanedTxs.length > 0) {
        orphanedTxs.sort((a, b) => b.created_at - a.created_at);
        const keepTx = orphanedTxs[0];
        validTxIds.add(keepTx.id);
        
        await supabase.from('transactions').update({ buyer_code: bCode, amount: inq.net_amount }).eq('id', keepTx.id);
        fixed++;
        
        for (let i = 1; i < orphanedTxs.length; i++) {
          toDelete.push(orphanedTxs[i].id);
        }
      } else {
        // Create new
        const { data: newTx } = await supabase.from('transactions').insert({
          shop_id: inq.shop_id,
          buyer_code: bCode,
          type: 'SALE',
          amount: inq.net_amount,
          date: inq.date,
          slip_number: inq.slip_number,
          note: `Bill #${inq.slip_number}`,
          created_at: inq.created_at || Date.now()
        }).select().single();
        if (newTx) validTxIds.add(newTx.id);
        fixed++;
      }
    }
  }
  
  if (toDelete.length > 0) {
    console.log(`Deleting ${toDelete.length} duplicate/hijacked transactions...`);
    for (let i=0; i<toDelete.length; i+=100) {
      await supabase.from('transactions').delete().in('id', toDelete.slice(i, i+100));
    }
  }

  console.log(`Fixed ${fixed} transactions. DB is now fully synced.`);
}

fix().catch(console.error);
