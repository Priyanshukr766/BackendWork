CREATE INDEX idx_products_category_updated_id
ON products (
  category,
  updated_at DESC,
  id DESC
);
