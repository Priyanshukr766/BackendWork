# CodeVector Backend — Product Browsing API

A Node.js + Express backend for browsing ~200,000 products with fast, stable pagination — built as a take-home assignment.

---

## Architecture Overview

```
Client
  │
  ▼
GET /api/products?category=Books&cursor=<optional>
  │
  ├── routes/products.routes.js       — maps URL to controller
  ├── controllers/products.controller.js — validates request, sends response
  ├── services/products.service.js    — business logic (cursor, has_more)
  ├── repositories/products.repository.js — SQL queries only
  └── config/db.js                    — shared pg connection pool
                │
                ▼
        PostgreSQL (Supabase)
        products table
        composite index on (category, updated_at DESC, id DESC)
```

**Layered design rules:**
- **Controller** — HTTP only. No SQL. No business logic.
- **Service** — Business logic only. No SQL. No HTTP.
- **Repository** — SQL only. No business logic.

---

## API

### `GET /api/products`

| Parameter  | Required | Description                                      |
|------------|----------|--------------------------------------------------|
| `category` | ✅ Yes   | Filter products by category                      |
| `cursor`   | ❌ No    | Pagination cursor returned by the previous page  |

**First page:**
```
GET /api/products?category=Books
```

**Next page:**
```
GET /api/products?category=Books&cursor=eyJ1cGRhdGVkQXQi...
```

**Response:**
```json
{
  "products": [
    {
      "id": 199991,
      "name": "Product-199991",
      "category": "Books",
      "price": "568.91",
      "created_at": "2026-06-15T14:49:48.901Z",
      "updated_at": "2026-06-23T17:14:39.536Z"
    }
  ],
  "next_cursor": "eyJ1cGRhdGVkQXQiOiIy...",
  "has_more": true
}
```

**Last page response:**
```json
{
  "products": [...],
  "next_cursor": null,
  "has_more": false
}
```

**Error responses:**

| Status | Reason                          |
|--------|---------------------------------|
| `400`  | Missing `category` parameter    |
| `400`  | Malformed or invalid `cursor`   |
| `500`  | Unexpected server/database error|

### `GET /health`

Returns `{ "status": "ok", "message": "Server is running" }`.

---

## Why Cursor Pagination (not OFFSET)

### The OFFSET problem

```sql
-- Fetching page 5000 with OFFSET:
SELECT * FROM products ORDER BY updated_at DESC LIMIT 20 OFFSET 100000;
```

PostgreSQL must **scan and discard 100,000 rows** before returning the 20 you need.
Performance degrades linearly — the deeper the page, the slower the query.

OFFSET also causes **data integrity problems** when rows are inserted or updated:
- **Duplicates** — new rows push existing ones down; a row already seen appears on the next page again.
- **Skipped rows** — rows shift up past the offset boundary and are never seen.

### Why cursor pagination solves this

Instead of "give me page 50", the client says **"give me products after this position"**.

The cursor encodes the exact position of the last seen product:
```json
{ "updatedAt": "2026-06-23T11:43:11.000Z", "id": 161249 }
```

This is Base64-encoded and returned as `next_cursor`. The client sends it back on the next request.

The backend translates it into a SQL condition:
```sql
WHERE category = $1
  AND (
    updated_at < $2
    OR (updated_at = $2 AND id < $3)
  )
ORDER BY updated_at DESC, id DESC
LIMIT 21
```

This navigates directly to the correct position using the index — **no skipping, no scanning**.

---

## Why `updated_at + id` Ordering

Sorting by `updated_at DESC` alone is **not deterministic** — many products can share the same timestamp.

```
id=100, updated_at=10:10
id=101, updated_at=10:10   ← same timestamp, arbitrary ordering
id=102, updated_at=10:10
```

Adding `id DESC` as a tiebreaker gives every product **one exact position** in the result set. This is required for reliable cursor pagination.

---

## Why the Composite Index

```sql
CREATE INDEX idx_products_category_updated_id
ON products (category, updated_at DESC, id DESC);
```

This index matches the actual query pattern exactly:

```sql
WHERE category = ?           -- uses first column of index (equality filter)
ORDER BY updated_at DESC, id DESC  -- already sorted in index order
```

PostgreSQL can **filter by category and read rows in sorted order in a single index scan** — no separate sort step, no full table scan.

### Why not just index `category`?
It would filter correctly but PostgreSQL would still sort the results — expensive on 200,000 rows.

### Why not just index `updated_at`?
It would sort correctly but PostgreSQL would scan rows from all categories and filter after — many wasted reads.

### Why composite wins
The index mirrors the full query. PostgreSQL does the minimum amount of work possible.

---

## `has_more` — Without `COUNT(*)`

A `COUNT(*)` query on a large table is expensive. This design avoids it entirely.

Instead, the API always fetches **`page_size + 1`** rows (21 instead of 20):

```
rows.length > 20  →  has_more = true   (slice back to 20 for response)
rows.length ≤ 20  →  has_more = false  (already on the last page)
```

One query. No extra round trip.

---

## Consistency Model

**Guaranteed:**
- No duplicate records caused by new inserts during pagination
- Stable, deterministic traversal order

**Known tradeoff:**
- A product that is **updated** while a user is browsing may shift to a higher position (newer `updated_at`). If the user has already passed that position with their cursor, they will not see the updated product again.

This is explicitly accepted as a reasonable tradeoff for a 3–4 hour assignment scope. True historical snapshot consistency would require versioned records or MVCC session snapshots.

---

## Project Structure

```
backend/
├── .env.example                        ← environment variable template
├── package.json
├── sql/
│   ├── schema.sql                      ← products table DDL
│   └── indexes.sql                     ← composite index DDL
└── src/
    ├── app.js                          ← Express setup, middleware, routes
    ├── server.js                       ← HTTP server entry point
    ├── config/
    │   └── db.js                       ← pg connection pool
    ├── routes/
    │   └── products.routes.js          ← route definitions
    ├── controllers/
    │   └── products.controller.js      ← request/response handling
    ├── services/
    │   └── products.service.js         ← business logic
    ├── repositories/
    │   └── products.repository.js      ← SQL queries
    ├── utils/
    │   └── cursor.js                   ← encode/decode cursor
    └── seed/
        └── generateProducts.js         ← seed 200,000 products
```

---

## How the Seed Script Works

```
node src/seed/generateProducts.js
```

- Generates 200,000 products in memory in batches of **1,000**
- Each batch is inserted with a **single multi-row INSERT** — 1,000 rows per SQL call
- Reduces DB round trips from **200,000 → 200**
- Completes in approximately **40 seconds** over a Supabase connection

**Data characteristics:**
- `name` — `Product-1` through `Product-200000`
- `category` — randomly chosen from 8 categories
- `price` — random between `10.00` and `1000.00`
- `created_at` — random timestamp within the past year
- `updated_at` — `created_at` + random 0–30 day offset

---

## Local Setup

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/postgres
PORT=5000
```

> **Note:** If your password contains special characters (e.g. `@`), URL-encode them (`@` → `%40`).

### 3. Run database migration
```bash
node src/migrate.js
```

### 4. Seed the database
```bash
node src/seed/generateProducts.js
```

### 5. Start the server
```bash
node src/server.js
```

---

## Deployment (Render + Supabase)

1. **Supabase** — Create a project, copy the connection URI
2. **Render** — Connect your GitHub repo, set `DATABASE_URL` and `PORT` as environment variables
3. Render will run `npm start` → `node src/server.js`

---

## Categories

`Electronics` · `Books` · `Fashion` · `Home` · `Sports` · `Beauty` · `Toys` · `Automotive`

---

## Future Improvements

| Improvement | Description |
|---|---|
| **Snapshot consistency** | Versioned product records or MVCC session snapshots for strong read consistency |
| **Cursor signing** | HMAC-sign cursors to prevent tampering |
| **Redis cache** | Cache hot category pages to reduce DB load |
| **Read replicas** | Route read queries to replicas under heavy load |
| **Rate limiting** | Protect the API from abuse |
| **Search support** | Full-text search on `name` with dedicated GIN index |
| **Reverse pagination** | Support `previous_cursor` for backwards navigation |

---

## Interview Talking Points

**Why OFFSET is problematic:**
OFFSET requires the database to skip N rows before returning results. Performance degrades linearly with page depth. It also causes duplicates and missing records when data changes between requests.

**Why cursor pagination is faster:**
The cursor encodes a position in the ordering. The database navigates directly to that position using an index — no rows are skipped or scanned unnecessarily.

**Why `updated_at` alone is insufficient:**
Multiple products can share the same timestamp. Without a tiebreaker, ordering is non-deterministic and cursors become unreliable.

**Why `id` is the tiebreaker:**
IDs are unique and sequential. `ORDER BY updated_at DESC, id DESC` gives every row a single, stable position.

**Why the composite index:**
The index column order `(category, updated_at DESC, id DESC)` matches the query's `WHERE category = ?` filter and `ORDER BY updated_at DESC, id DESC` sort exactly. PostgreSQL can satisfy the entire query from the index without a table scan or sort step.

**How `has_more` works without `COUNT(*)`:**
Fetch `page_size + 1` rows. If 21 rows come back, there is a next page. Slice to 20 for the response. One query, no extra round trip.
