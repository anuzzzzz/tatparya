-- ============================================================
-- WhatsApp Commerce Engine Tables
-- ============================================================

-- ============================================================
-- CUSTOMERS (buyer records for WhatsApp communication)
-- ============================================================

CREATE TABLE customers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  phone           TEXT NOT NULL,
  name            TEXT,
  email           TEXT,
  source          TEXT NOT NULL DEFAULT 'checkout'
                    CHECK (source IN ('checkout','whatsapp_optin','manual_import','instagram','other')),
  total_orders    INT NOT NULL DEFAULT 0,
  total_spent     NUMERIC(12,2) NOT NULL DEFAULT 0,
  last_order_date TIMESTAMPTZ,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  opted_in        BOOLEAN NOT NULL DEFAULT false,
  opted_in_at     TIMESTAMPTZ,
  trust_score     INT DEFAULT 50,
  city            TEXT,
  pincode         TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(store_id, phone)
);

CREATE INDEX idx_customers_store ON customers(store_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_opted_in ON customers(store_id, opted_in) WHERE opted_in = true;
CREATE INDEX idx_customers_tags ON customers USING GIN(tags);

CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- CUSTOMER SEGMENTS
-- ============================================================

CREATE TABLE customer_segments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  filter_rules    JSONB NOT NULL DEFAULT '{}'::jsonb,
  customer_count  INT NOT NULL DEFAULT 0,
  auto_update     BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_segments_store ON customer_segments(store_id);

CREATE TRIGGER trg_segments_updated_at BEFORE UPDATE ON customer_segments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- WHATSAPP TEMPLATES
-- ============================================================

CREATE TABLE whatsapp_templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  language        TEXT NOT NULL DEFAULT 'en',
  category        TEXT NOT NULL CHECK (category IN ('marketing','utility','authentication')),
  body_text       TEXT NOT NULL,
  header_type     TEXT CHECK (header_type IN ('text','image','video','document')),
  header_content  TEXT,
  buttons         JSONB NOT NULL DEFAULT '[]'::jsonb,
  variables       TEXT[] NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','submitted','approved','rejected')),
  wa_template_id  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wa_templates_store ON whatsapp_templates(store_id);

CREATE TRIGGER trg_wa_templates_updated_at BEFORE UPDATE ON whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- CAMPAIGNS
-- ============================================================

CREATE TABLE campaigns (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id          UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  type              TEXT NOT NULL
                      CHECK (type IN ('broadcast','cart_recovery','winback','back_in_stock',
                                      'festive','product_launch','post_purchase')),
  segment_id        UUID REFERENCES customer_segments(id),
  template_id       UUID REFERENCES whatsapp_templates(id),
  message_body      JSONB NOT NULL DEFAULT '{}'::jsonb,
  media_urls        TEXT[] NOT NULL DEFAULT '{}',
  status            TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','scheduled','sending','sent','analyzed','cancelled')),
  scheduled_at      TIMESTAMPTZ,
  sent_count        INT NOT NULL DEFAULT 0,
  delivered_count   INT NOT NULL DEFAULT 0,
  read_count        INT NOT NULL DEFAULT 0,
  clicked_count     INT NOT NULL DEFAULT 0,
  converted_count   INT NOT NULL DEFAULT 0,
  revenue_generated NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaigns_store ON campaigns(store_id);
CREATE INDEX idx_campaigns_status ON campaigns(store_id, status);

CREATE TRIGGER trg_campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- MESSAGES (individual WhatsApp messages)
-- ============================================================

CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  campaign_id     UUID REFERENCES campaigns(id),
  customer_id     UUID REFERENCES customers(id),
  phone           TEXT NOT NULL,
  direction       TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  template_id     UUID REFERENCES whatsapp_templates(id),
  body            TEXT,
  media_url       TEXT,
  status          TEXT NOT NULL DEFAULT 'queued'
                    CHECK (status IN ('queued','sent','delivered','read','failed')),
  wa_message_id   TEXT,
  sent_at         TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  read_at         TIMESTAMPTZ,
  clicked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_store ON messages(store_id);
CREATE INDEX idx_messages_campaign ON messages(campaign_id);
CREATE INDEX idx_messages_customer ON messages(customer_id);
CREATE INDEX idx_messages_phone ON messages(phone);
