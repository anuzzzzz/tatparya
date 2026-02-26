-- ============================================================
-- Tatparya Core Tables
-- Every table has store_id for tenant isolation.
-- Application queries always filter by store_id.
-- RLS is the defense-in-depth safety net.
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- STORES
-- ============================================================

CREATE TABLE stores (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  vertical      TEXT NOT NULL DEFAULT 'general'
                  CHECK (vertical IN ('fashion','fmcg','electronics','jewellery','beauty','food','home_decor','general')),
  description   TEXT,
  store_config  JSONB NOT NULL DEFAULT '{}'::jsonb,
  whatsapp_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  status        TEXT NOT NULL DEFAULT 'onboarding'
                  CHECK (status IN ('onboarding','active','paused','suspended')),
  custom_domain TEXT UNIQUE,
  gstin         TEXT,
  business_name TEXT,
  registered_address JSONB,
  state_code    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stores_owner ON stores(owner_id);
CREATE INDEX idx_stores_slug ON stores(slug);
CREATE INDEX idx_stores_status ON stores(status);

-- ============================================================
-- CATEGORIES
-- ============================================================

CREATE TABLE categories (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  parent_id       UUID REFERENCES categories(id) ON DELETE SET NULL,
  vertical_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_hsn_code TEXT,
  position        INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(store_id, slug)
);

CREATE INDEX idx_categories_store ON categories(store_id);
CREATE INDEX idx_categories_parent ON categories(parent_id);

-- ============================================================
-- PRODUCTS
-- ============================================================

CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  description     TEXT,
  price           NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  compare_at_price NUMERIC(12,2) CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  currency        TEXT NOT NULL DEFAULT 'INR',
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','active','archived')),
  category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  images          JSONB NOT NULL DEFAULT '[]'::jsonb,
  vertical_data   JSONB NOT NULL DEFAULT '{}'::jsonb,
  seo_meta        JSONB NOT NULL DEFAULT '{}'::jsonb,
  hsn_code        TEXT,
  gst_rate        NUMERIC(4,2),
  search_vector   TSVECTOR,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(store_id, slug)
);

CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_products_store_status ON products(store_id, status);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_search ON products USING GIN(search_vector);
CREATE INDEX idx_products_tags ON products USING GIN(tags);

-- Auto-update search_vector on insert/update
CREATE OR REPLACE FUNCTION products_search_vector_trigger() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_search_vector
  BEFORE INSERT OR UPDATE OF name, description, tags ON products
  FOR EACH ROW EXECUTE FUNCTION products_search_vector_trigger();

-- ============================================================
-- VARIANTS
-- ============================================================

CREATE TABLE variants (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_id      UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  sku           TEXT,
  attributes    JSONB NOT NULL DEFAULT '{}'::jsonb,
  price         NUMERIC(12,2),  -- NULL = use product price
  stock         INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  reserved      INT NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  weight_grams  INT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(store_id, sku)
);

CREATE INDEX idx_variants_product ON variants(product_id);
CREATE INDEX idx_variants_store ON variants(store_id);

-- ============================================================
-- GST RATES LOOKUP
-- ============================================================

CREATE TABLE gst_rates (
  hsn_code          TEXT PRIMARY KEY,
  description       TEXT NOT NULL,
  rate              NUMERIC(4,2) NOT NULL,
  threshold_amount  NUMERIC(12,2),
  rate_above_threshold NUMERIC(4,2)
);

-- ============================================================
-- Updated-at trigger (reusable)
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stores_updated_at BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_variants_updated_at BEFORE UPDATE ON variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
