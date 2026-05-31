import { supabase } from '@/lib/supabase';
import type { Inquiry } from '@/types/inquiry';

/**
 * Adjusts the buyer's ledger and balance when a bill is edited or deleted.
 */
export const adjustLedgerForBillEdit = async (
  shopId: string,
  slipNumber: number,
  oldStatus: string,
  oldPaymentMode: string,
  oldNetAmount: number,
  oldCustomerName: string,
  oldCustomerPhone: string,
  newStatus: string,
  newPaymentMode: string,
  newNetAmount: number,
  newCustomerName: string,
  newCustomerPhone: string
) => {
  const wasConfirmed = oldStatus === 'CONFIRMED';
  const isConfirmed = newStatus === 'CONFIRMED';

  if (!wasConfirmed && !isConfirmed) {
    // Neither old nor new is confirmed, nothing to sync with ledger
    return;
  }

  // Helper to find or create a buyer by name and phone
  const findOrCreateBuyer = async (name: string, phone: string): Promise<string> => {
    const { data: buyerRows, error: buyerFetchError } = await supabase
      .from('buyers')
      .select('*')
      .eq('shop_id', shopId);
    if (buyerFetchError) throw new Error(buyerFetchError.message);

    const normalizedName = name.trim().toLowerCase();
    const normalizedPhone = phone.trim();
    const existing = ((buyerRows ?? []) as Record<string, unknown>[]).find((buyer) => {
      const buyerPhone = String(buyer.phone ?? '').trim();
      const buyerName = String(buyer.name ?? '').trim().toLowerCase();
      return (
        (!!normalizedPhone && buyerPhone === normalizedPhone) ||
        (!!normalizedName && buyerName === normalizedName)
      );
    });

    if (existing) {
      return existing.code as string;
    } else {
      const now = Date.now();
      const buyerCode = `B${now}`;
      const { error: buyerInsertError } = await supabase.from('buyers').insert({
        shop_id: shopId,
        code: buyerCode,
        name: name.trim(),
        phone: phone.trim(),
        outstanding_balance: 0,
        last_transaction_date: now,
        created_at: now,
      });
      if (buyerInsertError) throw new Error(buyerInsertError.message);
      return buyerCode;
    }
  };

  // Helper to adjust a buyer's outstanding balance
  const adjustBuyerBalance = async (buyerCode: string, delta: number) => {
    const { data: buyer, error: fetchErr } = await supabase
      .from('buyers')
      .select('*')
      .eq('shop_id', shopId)
      .eq('code', buyerCode)
      .single();
    if (fetchErr) throw new Error(fetchErr.message);

    const { error: updateErr } = await supabase
      .from('buyers')
      .update({
        outstanding_balance: Number(buyer.outstanding_balance ?? 0) + delta,
        last_transaction_date: Date.now(),
      })
      .eq('id', buyer.id);
    if (updateErr) throw new Error(updateErr.message);
  };

  // Scenario 1: The bill WAS confirmed, but is NO LONGER confirmed (or payment mode changed from UDHAARI).
  // Reverse the old transaction and subtract the old netAmount from the old buyer.
  if (wasConfirmed && oldPaymentMode === 'UDHAARI') {
    const { data: oldTx, error: txFetchErr } = await supabase
      .from('transactions')
      .select('*')
      .eq('shop_id', shopId)
      .eq('type', 'SALE')
      .eq('slip_number', slipNumber)
      .maybeSingle();
    if (txFetchErr) throw new Error(txFetchErr.message);

    if (oldTx) {
      // Subtract old amount from old buyer
      await adjustBuyerBalance(oldTx.buyer_code, -oldTx.amount);
      // Delete old transaction
      const { error: delErr } = await supabase
        .from('transactions')
        .delete()
        .eq('id', oldTx.id);
      if (delErr) throw new Error(delErr.message);
    }
  }

  // Scenario 2: The bill IS confirmed, and the new payment mode is UDHAARI.
  // Add the new transaction and add the new netAmount to the new buyer.
  if (isConfirmed && newPaymentMode === 'UDHAARI') {
    const newBuyerCode = await findOrCreateBuyer(newCustomerName, newCustomerPhone);
    const now = Date.now();
    const { error: txInsertErr } = await supabase.from('transactions').insert({
      shop_id: shopId,
      buyer_code: newBuyerCode,
      type: 'SALE',
      amount: newNetAmount,
      date: now,
      note: `Bill #${slipNumber}`,
      slip_number: slipNumber,
      created_at: now,
    });
    if (txInsertErr) throw new Error(txInsertErr.message);
    // Add new amount to new buyer
    await adjustBuyerBalance(newBuyerCode, newNetAmount);
  }
};

/**
 * Fully deletes a bill and reverses any ledger impact.
 * - CONFIRMED + UDHAARI: removes the SALE transaction and reduces buyer balance.
 * - Then deletes the inquiry row itself.
 */
export const deleteConfirmedBill = async (
  shopId: string,
  inquiry: Pick<Inquiry, 'id' | 'slipNumber' | 'status' | 'paymentMode' | 'netAmount'>
) => {
  if (inquiry.status === 'CONFIRMED' && inquiry.paymentMode === 'UDHAARI') {
    const { data: tx, error: txErr } = await supabase
      .from('transactions')
      .select('*')
      .eq('shop_id', shopId)
      .eq('type', 'SALE')
      .eq('slip_number', inquiry.slipNumber)
      .maybeSingle();
    if (txErr) throw new Error(txErr.message);

    if (tx) {
      const { data: buyer, error: buyerErr } = await supabase
        .from('buyers')
        .select('outstanding_balance, id')
        .eq('shop_id', shopId)
        .eq('code', tx.buyer_code)
        .single();
      if (buyerErr) throw new Error(buyerErr.message);

      const { error: buyerUpdateErr } = await supabase
        .from('buyers')
        .update({ outstanding_balance: Number(buyer.outstanding_balance) - Number(tx.amount) })
        .eq('id', buyer.id);
      if (buyerUpdateErr) throw new Error(buyerUpdateErr.message);

      const { error: txDeleteErr } = await supabase.from('transactions').delete().eq('id', tx.id);
      if (txDeleteErr) throw new Error(txDeleteErr.message);
    }
  }

  const { error } = await supabase.from('inquiries').delete().eq('id', inquiry.id);
  if (error) throw new Error(error.message);
};
