global.WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function reconcile() {
  console.log('Fetching inquiries and transactions...');
  
  const { data: inquiries, error: inqErr } = await supabase.from('inquiries').select('*').eq('status', 'CONFIRMED');
  const { data: txs, error: txErr } = await supabase.from('transactions').select('*').in('type', ['SALE', 'PURCHASE']);
  const { data: buyers, error: buyErr } = await supabase.from('buyers').select('*');
  
  if (inqErr || txErr || buyErr) {
    console.error(inqErr, txErr, buyErr);
    return;
  }

  // 1. Map all existing buyers
  let allBuyers = [...buyers];
  async function getBuyerCode(name, phone, partyType) {
    if (!name) return null;
    const nName = name.trim().toLowerCase();
    const nPhone = (phone || '').trim();
    
    let existing = allBuyers.find(b => {
      const bName = (b.name || '').trim().toLowerCase();
      const bPhone = (b.phone || '').trim();
      return (nPhone && bPhone === nPhone) || (nName && bName === nName);
    });
    
    if (!existing) {
      const newCode = (partyType === 'AGENT' ? 'A' : 'B') + Date.now() + Math.floor(Math.random()*1000);
      const { data } = await supabase.from('buyers').insert({
        shop_id: inquiries[0].shop_id,
        code: newCode,
        name: name.trim(),
        phone: nPhone,
        party_type: partyType,
        outstanding_balance: 0,
        last_transaction_date: Date.now(),
        created_at: Date.now()
      }).select().single();
      existing = data;
      allBuyers.push(existing);
      console.log(`Created missing ${partyType} ${name} with code ${newCode}`);
    }
    return existing.code;
  }

  // Set of valid transaction IDs that we want to keep
  const validTxIds = new Set();
  
  let inserted = 0;
  let updated = 0;

  for (const inq of inquiries) {
    // Check SALE for UDHAARI
    if (inq.payment_mode === 'UDHAARI' && inq.customer_name) {
      const bCode = await getBuyerCode(inq.customer_name, inq.customer_phone, 'BUYER');
      if (bCode) {
        let existingTx = txs.find(t => t.slip_number === inq.slip_number && t.type === 'SALE' && t.buyer_code === bCode);
        
        if (existingTx) {
          validTxIds.add(existingTx.id);
          if (Math.abs(Number(existingTx.amount) - Number(inq.net_amount)) > 0.01) {
            await supabase.from('transactions').update({ amount: inq.net_amount }).eq('id', existingTx.id);
            updated++;
            console.log(`Updated SALE amount for slip ${inq.slip_number} (${inq.customer_name}) to ${inq.net_amount}`);
          }
        } else {
          // Find any orphaned SALE transaction with this slip number just in case buyer code got mismatched
          let orphanedTx = txs.find(t => t.slip_number === inq.slip_number && t.type === 'SALE' && !validTxIds.has(t.id));
          if (orphanedTx) {
            await supabase.from('transactions').update({ buyer_code: bCode, amount: inq.net_amount }).eq('id', orphanedTx.id);
            validTxIds.add(orphanedTx.id);
            updated++;
            console.log(`Fixed orphaned SALE slip ${inq.slip_number} to buyer ${inq.customer_name} amt ${inq.net_amount}`);
          } else {
            const { data: newTx } = await supabase.from('transactions').insert({
              shop_id: inq.shop_id,
              buyer_code: bCode,
              type: 'SALE',
              amount: inq.net_amount,
              date: inq.date,
              note: `Bill #${inq.slip_number}`,
              slip_number: inq.slip_number,
              created_at: Date.now()
            }).select().single();
            validTxIds.add(newTx.id);
            inserted++;
            console.log(`Inserted missing SALE for slip ${inq.slip_number} (${inq.customer_name})`);
          }
        }
      }
    }
    
    // Check PURCHASE for AGENT
    if (inq.agent_purchase_amount > 0 && inq.source_agent_name) {
      const aCode = await getBuyerCode(inq.source_agent_name, inq.source_agent_phone, 'AGENT');
      if (aCode) {
        let existingTx = txs.find(t => t.slip_number === inq.slip_number && t.type === 'PURCHASE' && t.buyer_code === aCode);
        
        if (existingTx) {
          validTxIds.add(existingTx.id);
          if (Math.abs(Number(existingTx.amount) - Number(inq.agent_purchase_amount)) > 0.01) {
            await supabase.from('transactions').update({ amount: inq.agent_purchase_amount }).eq('id', existingTx.id);
            updated++;
            console.log(`Updated PURCHASE amount for slip ${inq.slip_number} to ${inq.agent_purchase_amount}`);
          }
        } else {
          let orphanedTx = txs.find(t => t.slip_number === inq.slip_number && t.type === 'PURCHASE' && !validTxIds.has(t.id));
          if (orphanedTx) {
            await supabase.from('transactions').update({ buyer_code: aCode, amount: inq.agent_purchase_amount }).eq('id', orphanedTx.id);
            validTxIds.add(orphanedTx.id);
            updated++;
          } else {
            const { data: newTx } = await supabase.from('transactions').insert({
              shop_id: inq.shop_id,
              buyer_code: aCode,
              type: 'PURCHASE',
              amount: inq.agent_purchase_amount,
              date: inq.date,
              note: `Stock Purchase Bill #${inq.slip_number}`,
              slip_number: inq.slip_number,
              created_at: Date.now()
            }).select().single();
            validTxIds.add(newTx.id);
            inserted++;
            console.log(`Inserted missing PURCHASE for slip ${inq.slip_number} (${inq.source_agent_name})`);
          }
        }
      }
    }
  }

  // Delete invalid SALE/PURCHASE transactions that aren't tied to an active bill
  let deleted = 0;
  for (const tx of txs) {
    if (!validTxIds.has(tx.id)) {
      await supabase.from('transactions').delete().eq('id', tx.id);
      deleted++;
      console.log(`Deleted invalid ${tx.type} transaction for slip ${tx.slip_number}`);
    }
  }

  console.log(`Done! Inserted: ${inserted}, Updated: ${updated}, Deleted: ${deleted}`);
}

reconcile();
