-- ============================================================
-- Order & Invoice Tables
-- ============================================================

-- ============================================================
-- ORDERS
-- ============================================================

CREATE TABLE orders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id          UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_number      TEXT NOT NULL,
  buyer_phone       TEXT NOT NULL,
  buyer_name        TEXT NOT NULL,
  buyer_email       TEXT,
  shipping_address  JSONB NOT NULL,
  billing_address   JSONB,
  line_items        JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal          NUMERIC(12,2) NOT NULL,
  discount_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_cost     NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  total             NUMERIC(12,2) NOT NULL,
  payment_method    TEXT NOT NULL CHECK (payment_method IN ('upi','card','netbanking','wallet','cod')),
  payment_status    TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','authorized','captured','failed','refunded')),
  payment_reference TEXT,
  status            TEXT NOT NULL DEFAULT 'created'
                      CHECK (status IN ('created','payment_pending','paid','cod_confirmed','cod_otp_verified',
                                        'processing','shipped','out_for_delivery','delivered',
                                        'cancelled','refunded','rto')),
  fulfillment_status TEXT NOT NULL DEFAULT 'unfulfilled'
                      CHECK (fulfillment_status IN ('unfulfilled','partially_fulfilled','fulfilled','returned')),
  shipping_mode     TEXT NOT NULL DEFAULT 'self_managed' CHECK (shipping_mode IN ('self_managed','shiprocket')),
  tracking_number   TEXT,
  tracking_url      TEXT,
  awb_number        TEXT,
  buyer_trust_score INT,
  cod_otp_verified  BOOLEAN DEFAULT false,
  invoice_number    TEXT,
  invoice_url       TEXT,
  discount_code     TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(store_id, order_number)
);

CREATE INDEX idx_orders_store ON orders(store_id);
CREATE INDEX idx_orders_store_status ON orders(store_id, status);
CREATE INDEX idx_orders_buyer_phone ON orders(buyer_phone);
CREATE INDEX idx_orders_created ON orders(store_id, created_at DESC);

-- Auto-generate order number (TTP-YYYYMM-NNNNN)
CREATE SEQUENCE order_number_seq START 1;

CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- INVOICES
-- ============================================================

CREATE TABLE invoices (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id          UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  invoice_number    TEXT NOT NULL,
  seller_gstin      TEXT,
  seller_name       TEXT NOT NULL,
  seller_address    JSONB,
  seller_state_code TEXT,
  buyer_name        TEXT NOT NULL,
  buyer_address     JSONB,
  buyer_state_code  TEXT,
  buyer_gstin       TEXT,
  line_items        JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal          NUMERIC(12,2) NOT NULL,
  discount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_charges  NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_gst      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_cgst        NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_sgst        NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_igst        NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_tax         NUMERIC(12,2) NOT NULL DEFAULT 0,
  grand_total       NUMERIC(12,2) NOT NULL,
  place_of_supply   TEXT,
  is_inter_state    BOOLEAN NOT NULL DEFAULT false,
  type              TEXT NOT NULL DEFAULT 'invoice' CHECK (type IN ('invoice','credit_note')),
  original_invoice_id UUID REFERENCES invoices(id),
  pdf_url           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(store_id, invoice_number)
);

CREATE INDEX idx_invoices_store ON invoices(store_id);
CREATE INDEX idx_invoices_order ON invoices(order_id);

-- ============================================================
-- DISCOUNTS / COUPONS
-- ============================================================

CREATE TABLE discounts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  code            TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('percentage','flat','bogo')),
  value           NUMERIC(12,2) NOT NULL,
  min_order_value NUMERIC(12,2),
  max_discount    NUMERIC(12,2),
  usage_limit     INT,
  used_count      INT NOT NULL DEFAULT 0,
  starts_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at         TIMESTAMPTZ,
  active          BOOLEAN NOT NULL DEFAULT true,
  whatsapp_only   BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(store_id, code)
);

CREATE INDEX idx_discounts_store ON discounts(store_id);
CREATE INDEX idx_discounts_code ON discounts(store_id, code);

CREATE TRIGGER trg_discounts_updated_at BEFORE UPDATE ON discounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- CART ABANDONMENTS (for future WhatsApp recovery)
-- ============================================================

CREATE TABLE cart_abandonments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  buyer_phone     TEXT NOT NULL,
  cart_items      JSONB NOT NULL DEFAULT '[]'::jsonb,
  cart_total      NUMERIC(12,2) NOT NULL DEFAULT 0,
  abandoned_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  recovery_sent   BOOLEAN NOT NULL DEFAULT false,
  recovered       BOOLEAN NOT NULL DEFAULT false,
  recovered_order_id UUID REFERENCES orders(id)
);

CREATE INDEX idx_cart_abandon_store ON cart_abandonments(store_id);
CREATE INDEX idx_cart_abandon_phone ON cart_abandonments(buyer_phone);
