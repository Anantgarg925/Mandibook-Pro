# MandiBook Operational Workflows

## Reference slip to final bill

1. Member creates a bill after inquiry/payment discussion.
2. App stores it as `status = PENDING` and `slip_status = draft`.
3. Draft/reference slip must show only item, grade, sacks, and weight. Rates, charges, and net amount stay hidden.
4. Admin verifies payment and rate, then authorizes.
5. App updates `status = CONFIRMED`, `slip_status = authorized`, `payment_received_at`, `payment_received_by`, `authorized_at`, and `authorized_by`.
6. Only the authorized bill should be sent to the customer's mobile number.

## Paytm/UPI payment flow

Use `payment_mode = UPI` for Paytm payments. Store the Paytm transaction/reference number in `upi_ref`.

Recommended operating rule:
- Member can collect payment and create the draft.
- Admin must match the Paytm credit/ref number before authorization.
- Customer receives the final bill only after admin authorization.

## Godown and wastage logic

Do not treat every leftover kilogram as godown stock. Track:
- `gross_arrival_kg`: original truck arrival weight.
- `wastage_kg`: dry/rotten/short weight found during closing.
- `wastage_reason`: note such as drying, rotten fruit, unloading shortage, or weighing mismatch.

Godown stock should be:

```text
godown_kg = total_kg - sold_kg - wastage_kg
```

In the app, moving stock to godown must be a closing action:
- User enters actual godown weight.
- User enters rotten/dry/shortage weight separately.
- App creates one godown stock row with only actual godown weight.
- App marks the original truck `CLOSED` so the same remaining stock cannot be moved again.
- App stores `source_truck_id` on the godown row to prevent duplicate godown entries for the same truck.

## Hidden source-agent stock

When an agent sells stock received from another agent:
- Register/attach the truck under the selling agent's shop.
- Store the original/source agent in `source_agent_name` and `source_agent_phone`.
- Keep `source_agent_hidden = true` so customer slips continue to show only the selling firm.
- Use the hidden fields only for internal reports and settlement.
- If the source was not known during truck registration, capture it in the new bill form with "Bought from another agent?".

## Subscription and tutorials

Start with a simple plan model:
- Trial: 7-14 days, all features.
- Basic: billing, trucks, buyers, reports.
- Pro: members, authorization, Paytm reference tracking, PDF/WhatsApp sharing.

First-time tutorial should be task based, not long text:
- Register first truck.
- Create reference slip.
- Authorize final bill.
- Send WhatsApp bill.
- Check report.
- Add member and PIN.

Each step should highlight the real button on that screen and let the user skip.
