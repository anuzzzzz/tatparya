ALTER TABLE stores ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE stores DROP CONSTRAINT stores_vertical_check;
ALTER TABLE stores ADD CONSTRAINT stores_vertical_check CHECK (vertical IN ('fashion','fmcg','electronics','jewellery','beauty','food','home_decor','general','pets'));