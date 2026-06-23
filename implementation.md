# CodeVector Take Home Assignment - Implementation Specification (Version 1)

## Objective

Build a backend service that:

* Stores ~200,000 products
* Supports category filtering
* Shows newest products first
* Supports fast pagination
* Avoids OFFSET-based pagination
* Uses cursor/keyset pagination
* Uses PostgreSQL (Supabase)
* Uses Node.js + Express + JavaScript
* Supports concurrent inserts/updates without duplicate records appearing during pagination
* Is easy to explain during interview

---

# Technology Stack

Backend:

* Node.js
* Express.js

Database:

* PostgreSQL (Supabase)

Database Driver:

* pg


Hosting:

* Render

Environment Variables:

* DATABASE_URL
* PORT

---

# Project Structure

backend/

src/

app.js

server.js

config/

db.js

routes/

products.routes.js

controllers/

products.controller.js

services/

products.service.js

repositories/

products.repository.js

utils/

cursor.js

seed/

generateProducts.js

sql/

schema.sql

indexes.sql

package.json

README.md

.env.example

---

# Core Design Decisions

## Pagination Strategy

Chosen:

* Cursor Pagination (Keyset Pagination)

Rejected:

* OFFSET / LIMIT

Reason:

OFFSET causes:

* Slow deep pagination
* Duplicate records
* Missing records

Cursor pagination scales much better.

---

## Ordering Strategy

Chosen:

ORDER BY updated_at DESC,
id DESC

Reason:

updated_at alone is not unique.

Two products may share same timestamp.

id acts as deterministic tiebreaker.

---

## Consistency Strategy

Chosen:

Cursor Pagination
+
Deterministic Ordering

Guarantees:

* No duplicates caused by inserts
* Stable traversal order

Not Implemented:

* Historical row versioning
* MVCC browsing snapshots

Reason:

Out of scope for 3-4 hour assignment.

Document as future improvement.

---

# Database Schema

Table:

products

Columns:

id BIGSERIAL PRIMARY KEY

name VARCHAR(255) NOT NULL

category VARCHAR(100) NOT NULL

price NUMERIC(10,2) NOT NULL

created_at TIMESTAMP NOT NULL

updated_at TIMESTAMP NOT NULL

---

# SQL Schema

CREATE TABLE products (
id BIGSERIAL PRIMARY KEY,
name VARCHAR(255) NOT NULL,
category VARCHAR(100) NOT NULL,
price NUMERIC(10,2) NOT NULL,
created_at TIMESTAMP NOT NULL,
updated_at TIMESTAMP NOT NULL
);

---

# Indexes

Critical Index:

CREATE INDEX idx_products_category_updated_id
ON products (
category,
updated_at DESC,
id DESC
);

Reason:

Supports:

WHERE category = ?

ORDER BY updated_at DESC, id DESC

Cursor pagination query.

---

# Seed Data

Target:

200000 products

Categories:

Electronics
Books
Fashion
Home
Sports
Beauty
Toys
Automotive

---

# Seed Generation Rules

Generate in-memory batches.

DO NOT:

for (let i = 0; i < 200000; i++) {
await insert(...)
}

Rejected because too slow.

Use:

Batch inserts

Example:

1000 rows per batch

---

# Seed Data Characteristics

name:

Product-1
Product-2
...

price:

Random between:
10 and 1000

category:

Random category

created_at:

Random timestamp within past year

updated_at:

created_at + random offset

---

# API Design

Base Route:

/api/products

---

# Endpoint

GET /api/products

---

# Query Parameters

category

Required

cursor

Optional

Example:

GET /api/products?category=Books

GET /api/products?category=Books&cursor=xxxx

---

# Cursor Format

Cursor Payload:

{
"updatedAt": "...",
"id": 481
}

Encode:

Base64(JSON.stringify(payload))

---

# Cursor Utilities

encodeCursor(data)

decodeCursor(cursor)

---

# Page Size

20

Internal Fetch Size

21

Reason:

Determine has_more

---

# First Page Query

SELECT *
FROM products
WHERE category = $1
ORDER BY updated_at DESC,
id DESC
LIMIT 21;

---

# Cursor Query

SELECT *
FROM products
WHERE category = $1
AND (
updated_at < $2
OR
(
updated_at = $2
AND id < $3
)
)
ORDER BY updated_at DESC,
id DESC
LIMIT 21;

---

# Determining has_more

If rows.length > 20

has_more = true

Else

has_more = false

---

# Response Construction

If 21 rows returned:

Use first 20 rows.

21st row only determines has_more.

---

# next_cursor Generation

Take last returned product.

Cursor:

{
updatedAt: lastProduct.updated_at,
id: lastProduct.id
}

Encode.

Return.

---

# API Response

{
"products": [
{
"id": 100,
"name": "Product-100",
"category": "Books",
"price": 199.99,
"created_at": "...",
"updated_at": "..."
}
],

"next_cursor": "encoded_string",

"has_more": true
}

---

# Last Page Response

{
"products": [...],

"next_cursor": null,

"has_more": false
}

---

# Request Lifecycle

1. User opens category

2. Frontend requests first page

3. Backend queries database

4. Database uses composite index

5. Backend returns:

   * products
   * next_cursor
   * has_more

6. Frontend stores cursor

7. User clicks next

8. Frontend sends cursor

9. Backend executes cursor query

10. Backend returns next page

---

# Repository Layer Responsibilities

Only database access.

Functions:

getFirstPage(category)

getNextPage(
category,
updatedAt,
id
)

---

# Service Layer Responsibilities

Business logic.

Functions:

buildCursor()

decodeCursor()

determineHasMore()

prepareResponse()

---

# Controller Responsibilities

Read request.

Validate parameters.

Call service.

Return JSON.

No SQL inside controller.

---

# Error Handling

Missing category

Return:

400

Invalid cursor

Return:

400

Database failure

Return:

500

---

# Environment Variables

DATABASE_URL=

PORT=5000

---

# Deployment

Supabase:

* Create database
* Run schema.sql
* Run indexes.sql
* Run seed script

Render:

* Deploy Express application
* Configure DATABASE_URL

---

# README Requirements

Include:

1. Architecture Overview

2. Why Cursor Pagination

3. Why Composite Index

4. Why updated_at + id ordering

5. Why OFFSET was rejected

6. How seed script works

7. Tradeoffs

8. Future Improvements

---

# Future Improvements Section

Mention:

1. True snapshot consistency

2. Versioned product history

3. Cursor signing

4. Redis caching

5. Rate limiting

6. Read replicas

---

# Interview Talking Points

Be prepared to explain:

Why OFFSET is problematic.

Why keyset pagination is faster.

Why updated_at alone is insufficient.

Why id is added as tiebreaker.

Why composite indexes help.

How has_more works.

Why page_size + 1 rows are fetched.

Why versioned snapshots were not implemented.

How you would extend the system with more time.
