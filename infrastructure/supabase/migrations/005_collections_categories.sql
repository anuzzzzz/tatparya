-- ============================================================
-- Phase 2: Collections, Product-Categories (many-to-many),
-- and enhanced categories table
-- From updated master prompt Section 6.3
-- ============================================================

-- ============================================================
-- ENHANCE CATEGORIES (add new columns from updated spec)
-- ============================================================

ALTER TABLE categories ADD COLUMN IF NOT EXISTS vertical TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS filter_config JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS seo_meta JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS product_count INT NOT NULL DEFAULT 0;

-- ============================================================
-- COLLECTIONS (curated or smart groupings)
-- Fashion: curated story-driven (Wedding Collection, Diwali Festive)
-- FMCG: functional (Everyday Essentials, Combo Deals)
-- ============================================================

CREATE TABLE collections (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id          UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL,
  type              TEXT NOT NULL DEFAULT 'manual' CHECK (type IN ('manual', 'smart')),
  description       TEXT,
  banner_image_url  TEXT,
  rules             JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order        TEXT NOT NULL DEFAULT 'manual'
                      CHECK (sort_order IN ('manual', 'price_asc', 'price_desc', 'newest', 'bestselling')),
  position          INT NOT NULL DEFAULT 0,
  is_featured       BOOLEAN NOT NULL DEFAULT false,
  valid_from        TIMESTAMPTZ,
  valid_until       TIMESTAMPTZ,
  product_count     INT NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(store_id, slug)
);

CREATE INDEX idx_collections_store ON collections(store_id);
CREATE INDEX idx_collections_featured ON collections(store_id, is_featured) WHERE is_featured = true;

CREATE TRIGGER trg_collections_updated_at BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- COLLECTION_PRODUCTS (junction table)
-- ============================================================

CREATE TABLE collection_products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id   UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  position        INT NOT NULL DEFAULT 0,

  UNIQUE(collection_id, product_id)
);

CREATE INDEX idx_colprod_collection ON collection_products(collection_id);
CREATE INDEX idx_colprod_product ON collection_products(product_id);
CREATE INDEX idx_colprod_store ON collection_products(store_id);

-- ============================================================
-- PRODUCT_CATEGORIES (many-to-many with primary flag)
-- A product can be in multiple categories but has one primary
-- ============================================================

CREATE TABLE product_categories (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id   UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  store_id      UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  is_primary    BOOLEAN NOT NULL DEFAULT false,

  UNIQUE(product_id, category_id)
);

CREATE INDEX idx_prodcat_product ON product_categories(product_id);
CREATE INDEX idx_prodcat_category ON product_categories(category_id);
CREATE INDEX idx_prodcat_store ON product_categories(store_id);
CREATE INDEX idx_prodcat_primary ON product_categories(product_id, is_primary) WHERE is_primary = true;

-- Ensure only one primary category per product
CREATE UNIQUE INDEX idx_prodcat_one_primary ON product_categories(product_id) WHERE is_primary = true;

-- ============================================================
-- RLS for new tables
-- ============================================================

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY collections_owner ON collections
  FOR ALL USING (user_owns_store(store_id));

CREATE POLICY collections_public_read ON collections
  FOR SELECT USING (
    status = 'active' AND
    EXISTS (SELECT 1 FROM stores WHERE id = store_id AND status = 'active')
  );

CREATE POLICY colprod_owner ON collection_products
  FOR ALL USING (user_owns_store(store_id));

CREATE POLICY colprod_public_read ON collection_products
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM stores WHERE id = store_id AND status = 'active')
  );

CREATE POLICY prodcat_owner ON product_categories
  FOR ALL USING (user_owns_store(store_id));

CREATE POLICY prodcat_public_read ON product_categories
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM stores WHERE id = store_id AND status = 'active')
  );
