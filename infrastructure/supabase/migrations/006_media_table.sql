-- ============================================================
-- Media Assets Table
-- Tracks all uploaded images with their enhancement status
-- and generated size variants.
-- ============================================================

CREATE TABLE media_assets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id) ON DELETE SET NULL,

  -- Original upload info
  original_key    TEXT NOT NULL,           -- R2 object key
  original_url    TEXT NOT NULL,           -- Public URL
  filename        TEXT NOT NULL,
  content_type    TEXT NOT NULL DEFAULT 'image/jpeg',
  file_size_bytes INT NOT NULL DEFAULT 0,

  -- Generated sizes (populated after enhancement)
  hero_key        TEXT,                    -- 1200x1600
  hero_url        TEXT,
  card_key        TEXT,                    -- 600x800
  card_url        TEXT,
  thumbnail_key   TEXT,                    -- 300x400
  thumbnail_url   TEXT,
  square_key      TEXT,                    -- 800x800
  square_url      TEXT,
  og_key          TEXT,                    -- 1200x630
  og_url          TEXT,

  -- AI analysis results
  ai_analysis     JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Status tracking
  enhancement_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (enhancement_status IN ('pending', 'processing', 'done', 'failed')),
  enhancement_error  TEXT,

  alt_text        TEXT,
  position        INT NOT NULL DEFAULT 0,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_store ON media_assets(store_id);
CREATE INDEX idx_media_product ON media_assets(product_id);
CREATE INDEX idx_media_status ON media_assets(enhancement_status);

-- Reuse the existing updated_at trigger
CREATE TRIGGER trg_media_updated_at BEFORE UPDATE ON media_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY media_select_own ON media_assets FOR SELECT
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

CREATE POLICY media_insert_own ON media_assets FOR INSERT
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

CREATE POLICY media_update_own ON media_assets FOR UPDATE
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

CREATE POLICY media_delete_own ON media_assets FOR DELETE
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));
