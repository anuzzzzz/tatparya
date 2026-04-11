-- Globally unique order number sequence.
-- Replaces the count-based approach which had a race condition
-- under concurrent checkouts (two orders could get the same number).
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

CREATE OR REPLACE FUNCTION next_order_number() RETURNS bigint AS $$
  SELECT nextval('order_number_seq');
$$ LANGUAGE sql;
