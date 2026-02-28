-- ============================================================
-- Tatparya Demo Store Seed
-- Run: psql postgresql://postgres:postgres@127.0.0.1:54322/postgres < seed-demo.sql
-- Or: cd infrastructure/supabase && npx supabase db reset --seed
-- ============================================================

-- First, get the user ID for the test phone (9876543210)
-- If the user hasn't logged in yet, we create a placeholder
-- The owner_id will be updated after first login

-- Use a fixed UUID for the demo store
DO $$
DECLARE
  v_owner_id UUID;
  v_store_id UUID := 'a0000000-0000-0000-0000-000000000001';
  v_cat_men UUID := 'c0000000-0000-0000-0000-000000000001';
  v_cat_women UUID := 'c0000000-0000-0000-0000-000000000002';
  v_cat_acc UUID := 'c0000000-0000-0000-0000-000000000003';
  v_p1 UUID := 'a1000000-0000-0000-0000-000000000001';
  v_p2 UUID := 'a2000000-0000-0000-0000-000000000002';
  v_p3 UUID := 'a3000000-0000-0000-0000-000000000003';
  v_p4 UUID := 'a4000000-0000-0000-0000-000000000004';
  v_p5 UUID := 'a5000000-0000-0000-0000-000000000005';
  v_p6 UUID := 'a6000000-0000-0000-0000-000000000006';
BEGIN
  -- Find user by phone
  SELECT id INTO v_owner_id FROM auth.users WHERE phone = '919876543210' LIMIT 1;

  IF v_owner_id IS NULL THEN
    RAISE NOTICE 'No user found for +919876543210. Please login first via dashboard, then re-run this script.';
    RETURN;
  END IF;

  RAISE NOTICE 'Found user: %', v_owner_id;

  -- ============================================================
  -- STORE
  -- ============================================================
  INSERT INTO stores (id, owner_id, name, slug, vertical, description, status, gstin, business_name, state_code, store_config, whatsapp_config)
  VALUES (
    v_store_id,
    v_owner_id,
    'Rangoli Fashion',
    'rangoli-fashion',
    'fashion',
    'Premium Indian ethnic wear — handcrafted sarees, kurtis, and accessories from Jaipur',
    'active',
    '08AABCU9603R1ZM',
    'Rangoli Fashion Pvt Ltd',
    '08',
    '{
      "design": {
        "layout": "boutique",
        "palette": {
          "mode": "custom",
          "primary": "#b91c1c",
          "secondary": "#7c3aed",
          "accent": "#f59e0b",
          "background": "#fffbeb",
          "surface": "#ffffff",
          "text": "#1c1917",
          "textMuted": "#78716c"
        },
        "fonts": {
          "display": "Playfair Display",
          "body": "Inter",
          "scale": 1.0
        },
        "hero": {
          "style": "full_bleed",
          "height": "full",
          "overlayOpacity": 0.3
        },
        "productCard": {
          "style": "hover_reveal",
          "showPrice": true,
          "showRating": true,
          "imageRatio": "3:4"
        },
        "nav": {
          "style": "sticky_minimal",
          "showSearch": true,
          "showCart": true,
          "showWhatsapp": true
        },
        "collection": {
          "style": "uniform_grid",
          "columns": { "mobile": 2, "desktop": 4 },
          "pagination": "infinite_scroll"
        },
        "checkout": {
          "style": "single_page",
          "showTrustBadges": true,
          "whatsappCheckout": false
        },
        "spacing": "balanced",
        "radius": "rounded",
        "imageStyle": "subtle_shadow",
        "animation": "fade"
      },
      "sections": { "homepage": [], "productPage": [] },
      "language": "en",
      "currency": "INR"
    }'::jsonb,
    '{
      "enabled": true,
      "businessPhone": "+919876543210",
      "autoOrderNotifications": true,
      "optInAtCheckout": true,
      "maxPromoMessagesPerWeek": 3
    }'::jsonb
  ) ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- CATEGORIES
  -- ============================================================
  INSERT INTO categories (id, store_id, name, slug, position, default_hsn_code) VALUES
    (v_cat_men, v_store_id, 'Men', 'men', 0, '6205'),
    (v_cat_women, v_store_id, 'Women', 'women', 1, '6211'),
    (v_cat_acc, v_store_id, 'Accessories', 'accessories', 2, '7117')
  ON CONFLICT (store_id, slug) DO NOTHING;

  -- ============================================================
  -- PRODUCTS
  -- ============================================================

  -- Product 1: Banarasi Silk Saree
  INSERT INTO products (id, store_id, name, slug, description, price, compare_at_price, status, category_id, tags, hsn_code, gst_rate, images)
  VALUES (
    v_p1, v_store_id,
    'Banarasi Silk Saree — Royal Maroon',
    'banarasi-silk-saree-royal-maroon',
    'Handwoven Banarasi silk saree in rich maroon with intricate gold zari work. This timeless piece features traditional motifs inspired by Mughal architecture. Comes with a matching blouse piece. Perfect for weddings, festivals, and special occasions.',
    4999, 7999, 'active', v_cat_women,
    ARRAY['saree', 'silk', 'banarasi', 'wedding', 'handwoven', 'zari'],
    '6211', 5,
    '[{"id": "img-1", "originalUrl": "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800", "alt": "Banarasi Silk Saree Royal Maroon", "position": 0, "enhancementStatus": "done"}]'::jsonb
  ) ON CONFLICT DO NOTHING;

  -- Product 2: Cotton Kurti Set
  INSERT INTO products (id, store_id, name, slug, description, price, compare_at_price, status, category_id, tags, hsn_code, gst_rate, images)
  VALUES (
    v_p2, v_store_id,
    'Block Print Cotton Kurti Set',
    'block-print-cotton-kurti-set',
    'Hand block-printed cotton kurti with matching palazzo pants. Sanganeri print from Jaipur artisans. Lightweight and breathable, perfect for everyday wear. Available in S, M, L, XL.',
    1299, 1899, 'active', v_cat_women,
    ARRAY['kurti', 'cotton', 'block-print', 'jaipur', 'daily-wear'],
    '6211', 5,
    '[{"id": "img-2", "originalUrl": "https://images.unsplash.com/photo-1594463750939-ebb28c3f7f75?w=800", "alt": "Block Print Cotton Kurti Set", "position": 0, "enhancementStatus": "done"}]'::jsonb
  ) ON CONFLICT DO NOTHING;

  -- Product 3: Men's Nehru Jacket
  INSERT INTO products (id, store_id, name, slug, description, price, compare_at_price, status, category_id, tags, hsn_code, gst_rate, images)
  VALUES (
    v_p3, v_store_id,
    'Linen Nehru Jacket — Olive Green',
    'linen-nehru-jacket-olive-green',
    'Classic Nehru jacket in premium linen. Perfect layering piece for weddings and festive occasions. Mandarin collar with front button closure. Pair with a kurta or crisp white shirt.',
    2499, 3499, 'active', v_cat_men,
    ARRAY['nehru-jacket', 'linen', 'men', 'wedding', 'festive'],
    '6203', 5,
    '[{"id": "img-3", "originalUrl": "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800", "alt": "Linen Nehru Jacket Olive Green", "position": 0, "enhancementStatus": "done"}]'::jsonb
  ) ON CONFLICT DO NOTHING;

  -- Product 4: Jhumka Earrings
  INSERT INTO products (id, store_id, name, slug, description, price, compare_at_price, status, category_id, tags, hsn_code, gst_rate, images)
  VALUES (
    v_p4, v_store_id,
    'Oxidized Silver Jhumka Earrings',
    'oxidized-silver-jhumka-earrings',
    'Statement oxidized silver jhumka earrings with intricate filigree work. Handcrafted by Rajasthani artisans. Lightweight and comfortable for all-day wear. Length: 3.5 inches.',
    599, 999, 'active', v_cat_acc,
    ARRAY['jhumka', 'earrings', 'oxidized', 'silver', 'handcrafted'],
    '7117', 12,
    '[{"id": "img-4", "originalUrl": "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800", "alt": "Oxidized Silver Jhumka Earrings", "position": 0, "enhancementStatus": "done"}]'::jsonb
  ) ON CONFLICT DO NOTHING;

  -- Product 5: Men's Kurta
  INSERT INTO products (id, store_id, name, slug, description, price, compare_at_price, status, category_id, tags, hsn_code, gst_rate, images)
  VALUES (
    v_p5, v_store_id,
    'Chikankari Cotton Kurta — White',
    'chikankari-cotton-kurta-white',
    'Lucknowi Chikankari hand-embroidered cotton kurta in classic white. Delicate shadow work with floral motifs. Perfect for summer festivals and casual occasions. Pre-washed for softness.',
    1799, 2499, 'active', v_cat_men,
    ARRAY['kurta', 'chikankari', 'lucknow', 'cotton', 'white', 'embroidered'],
    '6205', 5,
    '[{"id": "img-5", "originalUrl": "https://images.unsplash.com/photo-1622470953794-aa9c70b0fb9d?w=800", "alt": "Chikankari Cotton Kurta White", "position": 0, "enhancementStatus": "done"}]'::jsonb
  ) ON CONFLICT DO NOTHING;

  -- Product 6: Dupatta
  INSERT INTO products (id, store_id, name, slug, description, price, compare_at_price, status, category_id, tags, hsn_code, gst_rate, images)
  VALUES (
    v_p6, v_store_id,
    'Bandhani Silk Dupatta — Sunset Orange',
    'bandhani-silk-dupatta-sunset-orange',
    'Traditional Bandhani tie-dye dupatta in vibrant sunset orange. Pure silk with hand-tied dots creating stunning patterns. Made in Kutch, Gujarat. Dimensions: 2.5m x 0.9m.',
    899, 1299, 'active', v_cat_acc,
    ARRAY['dupatta', 'bandhani', 'silk', 'kutch', 'tie-dye', 'orange'],
    '6211', 5,
    '[{"id": "img-6", "originalUrl": "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=800", "alt": "Bandhani Silk Dupatta Sunset Orange", "position": 0, "enhancementStatus": "done"}]'::jsonb
  ) ON CONFLICT DO NOTHING;

  -- ============================================================
  -- VARIANTS (sizes for kurti and kurta)
  -- ============================================================
  INSERT INTO variants (store_id, product_id, sku, attributes, stock, price) VALUES
    (v_store_id, v_p2, 'BPK-S', '{"size": "S"}'::jsonb, 15, NULL),
    (v_store_id, v_p2, 'BPK-M', '{"size": "M"}'::jsonb, 25, NULL),
    (v_store_id, v_p2, 'BPK-L', '{"size": "L"}'::jsonb, 20, NULL),
    (v_store_id, v_p2, 'BPK-XL', '{"size": "XL"}'::jsonb, 10, NULL),
    (v_store_id, v_p3, 'NJ-38', '{"size": "38"}'::jsonb, 8, NULL),
    (v_store_id, v_p3, 'NJ-40', '{"size": "40"}'::jsonb, 12, NULL),
    (v_store_id, v_p3, 'NJ-42', '{"size": "42"}'::jsonb, 10, NULL),
    (v_store_id, v_p3, 'NJ-44', '{"size": "44"}'::jsonb, 5, NULL),
    (v_store_id, v_p5, 'CCK-S', '{"size": "S"}'::jsonb, 10, NULL),
    (v_store_id, v_p5, 'CCK-M', '{"size": "M"}'::jsonb, 20, NULL),
    (v_store_id, v_p5, 'CCK-L', '{"size": "L"}'::jsonb, 18, NULL),
    (v_store_id, v_p5, 'CCK-XL', '{"size": "XL"}'::jsonb, 8, NULL)
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- SAMPLE ORDER
  -- ============================================================
  INSERT INTO orders (
    store_id, order_number, buyer_phone, buyer_name, buyer_email,
    shipping_address, line_items,
    subtotal, discount_amount, shipping_cost, tax_amount, total,
    payment_method, payment_status, status
  ) VALUES (
    v_store_id,
    'TTP-202602-00001',
    '+919998887770',
    'Priya Sharma',
    'priya@example.com',
    '{"line1": "42, MG Road", "line2": "Near City Mall", "city": "Jaipur", "state": "Rajasthan", "pincode": "302001"}'::jsonb,
    ('[{"productId": "' || v_p1 || '", "name": "Banarasi Silk Saree — Royal Maroon", "quantity": 1, "unitPrice": 4999, "totalPrice": 4999, "hsnCode": "6211", "gstRate": 5},
      {"productId": "' || v_p4 || '", "name": "Oxidized Silver Jhumka Earrings", "quantity": 2, "unitPrice": 599, "totalPrice": 1198, "hsnCode": "7117", "gstRate": 12}]')::jsonb,
    6197, 0, 0, 454, 6651,
    'cod', 'pending', 'processing'
  ) ON CONFLICT DO NOTHING;

  -- Second order
  INSERT INTO orders (
    store_id, order_number, buyer_phone, buyer_name,
    shipping_address, line_items,
    subtotal, discount_amount, shipping_cost, tax_amount, total,
    payment_method, payment_status, status
  ) VALUES (
    v_store_id,
    'TTP-202602-00002',
    '+919876500001',
    'Rahul Mehta',
    '{"line1": "15, Nehru Nagar", "city": "Mumbai", "state": "Maharashtra", "pincode": "400001"}'::jsonb,
    ('[{"productId": "' || v_p5 || '", "name": "Chikankari Cotton Kurta — White", "quantity": 1, "unitPrice": 1799, "totalPrice": 1799, "hsnCode": "6205", "gstRate": 5, "attributes": {"size": "L"}},
      {"productId": "' || v_p3 || '", "name": "Linen Nehru Jacket — Olive Green", "quantity": 1, "unitPrice": 2499, "totalPrice": 2499, "hsnCode": "6203", "gstRate": 5, "attributes": {"size": "42"}}]')::jsonb,
    4298, 0, 0, 215, 4513,
    'cod', 'pending', 'delivered'
  ) ON CONFLICT DO NOTHING;

  RAISE NOTICE '✅ Demo store "Rangoli Fashion" created at /rangoli-fashion';
  RAISE NOTICE '📦 6 products, 12 variants, 2 orders seeded';

END $$;
