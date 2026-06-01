-- Migration: Offline Inventory Sync & Validation
-- Adds tracking fields to inquiries to handle offline oversell conflicts safely.

ALTER TABLE inquiries
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synced',
ADD COLUMN IF NOT EXISTS created_offline BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS needs_agent_review BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS optimistic_stock_at_creation FLOAT;

-- Create an RPC to safely validate and insert an offline bill with stock checking
CREATE OR REPLACE FUNCTION sync_offline_bill(bill_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_truck_id UUID;
    v_truck_total_kg FLOAT;
    v_sold_stock FLOAT;
    v_available_stock FLOAT;
    v_requested_weight FLOAT;
    v_inquiry_id UUID;
    v_slip_number INT;
BEGIN
    -- Extract essential fields
    v_truck_id := (bill_payload->>'truck_id')::UUID;
    v_requested_weight := (bill_payload->>'total_weight')::FLOAT;

    -- 1. Get current truck stock
    SELECT total_kg INTO v_truck_total_kg
    FROM trucks
    WHERE id = v_truck_id;

    IF v_truck_total_kg IS NULL THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', 'Truck not found'
        );
    END IF;

    -- 2. Calculate sold stock (confirmed or pending, excluding conflicts)
    SELECT COALESCE(SUM(total_weight), 0) INTO v_sold_stock
    FROM inquiries
    WHERE truck_id = v_truck_id
      AND status IN ('CONFIRMED', 'PENDING')
      AND (sync_status IS NULL OR sync_status != 'conflict');

    v_available_stock := v_truck_total_kg - v_sold_stock;

    -- 3. Validate stock
    IF v_requested_weight <= v_available_stock THEN
        -- Accept bill
        INSERT INTO inquiries (
            shop_id,
            slip_number,
            truck_id,
            truck_number,
            customer_name,
            customer_phone,
            grade,
            grade_name,
            sacks,
            weight_per_sack,
            total_weight,
            rate_per_kg,
            gross_amount,
            apmc_amount,
            bardana_amount,
            cartage_amount,
            net_amount,
            payment_mode,
            upi_ref,
            status,
            date,
            created_at,
            sync_status,
            created_offline,
            optimistic_stock_at_creation,
            needs_agent_review
        ) VALUES (
            (bill_payload->>'shop_id')::UUID,
            (bill_payload->>'slip_number')::INT,
            v_truck_id,
            bill_payload->>'truck_number',
            bill_payload->>'customer_name',
            bill_payload->>'customer_phone',
            bill_payload->>'grade',
            bill_payload->>'grade_name',
            (bill_payload->>'sacks')::INT,
            (bill_payload->>'weight_per_sack')::FLOAT,
            v_requested_weight,
            (bill_payload->>'rate_per_kg')::FLOAT,
            (bill_payload->>'gross_amount')::FLOAT,
            (bill_payload->>'apmc_amount')::FLOAT,
            (bill_payload->>'bardana_amount')::FLOAT,
            (bill_payload->>'cartage_amount')::FLOAT,
            (bill_payload->>'net_amount')::FLOAT,
            bill_payload->>'payment_mode',
            COALESCE(bill_payload->>'upi_ref', ''),
            COALESCE(bill_payload->>'status', 'PENDING'),
            (bill_payload->>'date')::BIGINT,
            (bill_payload->>'created_at')::BIGINT,
            'synced',
            true,
            (bill_payload->>'optimistic_stock')::FLOAT,
            CASE 
                WHEN (bill_payload->>'optimistic_stock')::FLOAT IS NOT NULL 
                     AND (bill_payload->>'optimistic_stock')::FLOAT < v_requested_weight 
                THEN true 
                ELSE false 
            END
        ) RETURNING id, slip_number INTO v_inquiry_id, v_slip_number;

        RETURN jsonb_build_object(
            'status', 'accepted',
            'final_slip_number', v_slip_number,
            'id', v_inquiry_id
        );
    ELSE
        -- Reject bill (conflict)
        INSERT INTO inquiries (
            shop_id,
            slip_number,
            truck_id,
            truck_number,
            customer_name,
            customer_phone,
            grade,
            grade_name,
            sacks,
            weight_per_sack,
            total_weight,
            rate_per_kg,
            gross_amount,
            apmc_amount,
            bardana_amount,
            cartage_amount,
            net_amount,
            payment_mode,
            upi_ref,
            status,
            date,
            created_at,
            sync_status,
            created_offline,
            optimistic_stock_at_creation,
            needs_agent_review
        ) VALUES (
            (bill_payload->>'shop_id')::UUID,
            (bill_payload->>'slip_number')::INT,
            v_truck_id,
            bill_payload->>'truck_number',
            bill_payload->>'customer_name',
            bill_payload->>'customer_phone',
            bill_payload->>'grade',
            bill_payload->>'grade_name',
            (bill_payload->>'sacks')::INT,
            (bill_payload->>'weight_per_sack')::FLOAT,
            v_requested_weight,
            (bill_payload->>'rate_per_kg')::FLOAT,
            (bill_payload->>'gross_amount')::FLOAT,
            (bill_payload->>'apmc_amount')::FLOAT,
            (bill_payload->>'bardana_amount')::FLOAT,
            (bill_payload->>'cartage_amount')::FLOAT,
            (bill_payload->>'net_amount')::FLOAT,
            bill_payload->>'payment_mode',
            COALESCE(bill_payload->>'upi_ref', ''),
            'PENDING',
            (bill_payload->>'date')::BIGINT,
            (bill_payload->>'created_at')::BIGINT,
            'conflict',
            true,
            (bill_payload->>'optimistic_stock')::FLOAT,
            true
        ) RETURNING id INTO v_inquiry_id;

        RETURN jsonb_build_object(
            'status', 'conflict',
            'required', v_requested_weight,
            'available', v_available_stock,
            'message', 'Stock insufficient at time of sync',
            'id', v_inquiry_id
        );
    END IF;
END;
$$;
