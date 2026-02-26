-- ============================================================
-- Seed Data for Development
-- ============================================================

-- GST Rate Lookup Table
INSERT INTO gst_rates (hsn_code, description, rate, threshold_amount, rate_above_threshold) VALUES
  ('6106', 'Knitted garments (women)', 5, 1000, 12),
  ('6109', 'T-shirts, vests (knitted)', 5, 1000, 12),
  ('6204', 'Women suits, dresses, skirts', 5, 1000, 12),
  ('6206', 'Women blouses, shirts', 5, 1000, 12),
  ('6211', 'Sarees, dhotis', 5, 1000, 12),
  ('6205', 'Men shirts', 5, 1000, 12),
  ('6203', 'Men suits, trousers', 5, 1000, 12),
  ('6402', 'Footwear (>Rs 1000)', 18, NULL, NULL),
  ('6404', 'Footwear (<=Rs 1000)', 5, 1000, 18),
  ('7113', 'Gold/silver jewellery', 3, NULL, NULL),
  ('7117', 'Imitation jewellery', 12, NULL, NULL),
  ('8517', 'Mobile phones, smartphones', 18, NULL, NULL),
  ('8471', 'Laptops, computers', 18, NULL, NULL),
  ('8518', 'Headphones, speakers', 18, NULL, NULL),
  ('3304', 'Cosmetics, makeup', 18, NULL, NULL),
  ('3305', 'Hair care products', 18, NULL, NULL),
  ('0901', 'Coffee, tea', 5, NULL, NULL),
  ('1006', 'Rice', 5, NULL, NULL),
  ('1905', 'Bread, biscuits, cakes', 18, NULL, NULL),
  ('6302', 'Bed linen, curtains', 12, NULL, NULL),
  ('9403', 'Furniture', 18, NULL, NULL),
  ('9965', 'Goods transport (shipping)', 18, NULL, NULL)
ON CONFLICT (hsn_code) DO NOTHING;
