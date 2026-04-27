-- Fix quotation_items table to match frontend logic
ALTER TABLE public.quotation_items DROP CONSTRAINT IF EXISTS quotation_items_price_list_item_id_fkey;

-- Rename columns safely if they exist
DO $$ 
BEGIN
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name='quotation_items' AND column_name='price_list_item_id') THEN
    ALTER TABLE public.quotation_items RENAME COLUMN price_list_item_id TO product_id;
  END IF;

  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name='quotation_items' AND column_name='final_line_price') THEN
    ALTER TABLE public.quotation_items RENAME COLUMN final_line_price TO total_price;
  END IF;
END $$;

ALTER TABLE public.quotation_items ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.quotation_items ALTER COLUMN product_id DROP NOT NULL;
