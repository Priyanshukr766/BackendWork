CREATE TABLE products (
  id         BIGSERIAL PRIMARY KEY,
  name       VARCHAR(255)   NOT NULL,
  category   VARCHAR(100)   NOT NULL,
  price      NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP      NOT NULL,
  updated_at TIMESTAMP      NOT NULL
);
