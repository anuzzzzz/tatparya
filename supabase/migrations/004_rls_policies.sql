-- ============================================================
-- Row Level Security (RLS) Policies
--
-- RLS is the SAFETY NET, not the primary isolation strategy.
-- Application code always filters by store_id explicitly.
-- If application code has a bug, RLS catches it.
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_abandonments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STORES: Owner can do everything
-- ============================================================

CREATE POLICY stores_owner_select ON stores
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY stores_owner_insert ON stores
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY stores_owner_update ON stores
  FOR UPDATE USING (owner_id = auth.uid());

-- Public read for active stores (storefronts need this)
CREATE POLICY stores_public_read ON stores
  FOR SELECT USING (status = 'active');

-- ============================================================
-- Helper function: Check if current user owns a store
-- ============================================================

CREATE OR REPLACE FUNCTION user_owns_store(p_store_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM stores WHERE id = p_store_id AND owner_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- CATEGORIES: Store owner CRUD
-- ============================================================

CREATE POLICY categories_owner ON categories
  FOR ALL USING (user_owns_store(store_id));

-- Public read for active stores (storefront)
CREATE POLICY categories_public_read ON categories
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM stores WHERE id = store_id AND status = 'active')
  );

-- ============================================================
-- PRODUCTS: Store owner CRUD, public read for active products
-- ============================================================

CREATE POLICY products_owner ON products
  FOR ALL USING (user_owns_store(store_id));

CREATE POLICY products_public_read ON products
  FOR SELECT USING (
    status = 'active' AND
    EXISTS (SELECT 1 FROM stores WHERE id = store_id AND status = 'active')
  );

-- ============================================================
-- VARIANTS: Store owner CRUD, public read
-- ============================================================

CREATE POLICY variants_owner ON variants
  FOR ALL USING (user_owns_store(store_id));

CREATE POLICY variants_public_read ON variants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM stores WHERE id = store_id AND status = 'active')
  );

-- ============================================================
-- ORDERS: Store owner can read/update
-- ============================================================

CREATE POLICY orders_owner ON orders
  FOR ALL USING (user_owns_store(store_id));

-- ============================================================
-- INVOICES: Store owner read
-- ============================================================

CREATE POLICY invoices_owner ON invoices
  FOR ALL USING (user_owns_store(store_id));

-- ============================================================
-- DISCOUNTS: Store owner CRUD
-- ============================================================

CREATE POLICY discounts_owner ON discounts
  FOR ALL USING (user_owns_store(store_id));

-- ============================================================
-- CUSTOMERS: Store owner CRUD
-- ============================================================

CREATE POLICY customers_owner ON customers
  FOR ALL USING (user_owns_store(store_id));

-- ============================================================
-- CUSTOMER SEGMENTS: Store owner CRUD
-- ============================================================

CREATE POLICY segments_owner ON customer_segments
  FOR ALL USING (user_owns_store(store_id));

-- ============================================================
-- WHATSAPP TEMPLATES: Store owner CRUD
-- ============================================================

CREATE POLICY templates_owner ON whatsapp_templates
  FOR ALL USING (user_owns_store(store_id));

-- ============================================================
-- CAMPAIGNS: Store owner CRUD
-- ============================================================

CREATE POLICY campaigns_owner ON campaigns
  FOR ALL USING (user_owns_store(store_id));

-- ============================================================
-- MESSAGES: Store owner read
-- ============================================================

CREATE POLICY messages_owner ON messages
  FOR ALL USING (user_owns_store(store_id));

-- ============================================================
-- CART ABANDONMENTS: Store owner read
-- ============================================================

CREATE POLICY cart_abandon_owner ON cart_abandonments
  FOR ALL USING (user_owns_store(store_id));

-- ============================================================
-- GST RATES: Public read (reference table)
-- ============================================================

ALTER TABLE gst_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY gst_rates_public_read ON gst_rates
  FOR SELECT USING (true);
