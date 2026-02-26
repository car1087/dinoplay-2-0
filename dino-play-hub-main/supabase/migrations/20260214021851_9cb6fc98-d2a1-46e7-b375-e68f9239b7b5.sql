
-- Add custom products table (admin defines products with name, quantity, price per day)
CREATE TABLE public.custom_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID NOT NULL REFERENCES public.daily_config(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_price INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage custom products"
ON public.custom_products FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view custom products"
ON public.custom_products FOR SELECT
TO authenticated
USING (true);

-- Add opening/closing hours to daily_config
ALTER TABLE public.daily_config
ADD COLUMN opening_hour TEXT DEFAULT '09:00',
ADD COLUMN closing_hour TEXT DEFAULT '21:00';

-- Add nequi_deposits and closing_notes to settlements
ALTER TABLE public.settlements
ADD COLUMN nequi_deposits INTEGER NOT NULL DEFAULT 0,
ADD COLUMN closing_notes TEXT DEFAULT '';

-- Add settlement_products to track product sales per settlement
CREATE TABLE public.settlement_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  settlement_id UUID NOT NULL REFERENCES public.settlements(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  initial_quantity INTEGER NOT NULL DEFAULT 0,
  final_quantity INTEGER NOT NULL DEFAULT 0,
  unit_price INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.settlement_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settlement products"
ON public.settlement_products FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Workers can create own settlement products"
ON public.settlement_products FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.settlements s
  WHERE s.id = settlement_products.settlement_id AND s.worker_id = auth.uid()
));

CREATE POLICY "Workers can view own settlement products"
ON public.settlement_products FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.settlements s
  WHERE s.id = settlement_products.settlement_id AND s.worker_id = auth.uid()
));
