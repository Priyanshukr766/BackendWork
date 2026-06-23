# CodeVector Take Home Assignment

# Engineering Design Document (Version 2)

---

# Executive Summary

The assignment requires a backend capable of browsing approximately 200,000 products, filtering by category, sorting by newest products first, and supporting pagination while data is changing. The primary challenge is not CRUD implementation but designing an efficient data-access strategy that remains performant and correct under concurrent modifications.

The proposed solution uses:

* PostgreSQL (Supabase)
* Node.js + Express
* Cursor (Keyset) Pagination
* Composite Database Indexes
* Deterministic Ordering

The design prioritizes:

* Fast pagination
* Efficient database access
* Scalability
* Simplicity
* Interview explainability

---

# Problem Analysis

At first glance the assignment appears simple:

```text
Show products.
Filter by category.
Paginate.
```

However the hidden challenge is:

```text
How do we paginate efficiently across
200,000 rows while data changes?
```

Naive approaches break down quickly.

---

# Why OFFSET Pagination Was Rejected

Typical implementation:

```sql
SELECT *
FROM products
ORDER BY updated_at DESC
LIMIT 20 OFFSET 100000;
```

Problems:

## Problem 1 — Performance

To fetch page 5000:

```text
Database must skip
100000 rows first.
```

The deeper the page:

```text
More rows skipped.
More work performed.
```

Complexity grows linearly.

---

## Problem 2 — Duplicate Records

Timeline:

```text
User loads Page 1.

New products inserted.

User requests Page 2.
```

Because row positions changed:

```text
Products may appear twice.
```

---

## Problem 3 — Missing Records

Timeline:

```text
User loads Page 1.

Rows inserted above current position.

User loads Page 2.
```

Some products may never be seen.

---

# Why Cursor Pagination Was Chosen

Instead of:

```text
Page Number
```

we store:

```text
Position in ordering.
```

Example:

```text
(updated_at=10:10, id=481)
```

This becomes the user's bookmark.

---

# Mental Model

OFFSET:

```text
Go to page 50.
```

Cursor:

```text
Continue after this position.
```

Cursor pagination tracks position.

OFFSET tracks row count.

Position-based navigation is significantly more stable.

---

# Ordering Strategy

The assignment requires:

```text
Newest products first.
```

Initial idea:

```sql
ORDER BY updated_at DESC
```

Problem:

```text
updated_at is not unique.
```

Example:

| id  | updated_at |
| --- | ---------- |
| 100 | 10:10      |
| 101 | 10:10      |
| 102 | 10:10      |

Database is free to return them in arbitrary order.

This creates pagination instability.

---

# Deterministic Ordering

Chosen:

```sql
ORDER BY updated_at DESC,
         id DESC
```

Reason:

```text
updated_at
+
id
```

creates a globally unique ordering.

Every product now has exactly one position.

---

# Why ID Is Used As Tiebreaker

Consider:

```text
10:10
```

shared by 100 products.

Without a secondary column:

```text
Ordering is ambiguous.
```

Adding:

```text
id DESC
```

creates deterministic ordering.

Necessary for reliable cursor pagination.

---

# Consistency Requirements

Assignment states:

```text
Products may be added or updated
while browsing.
```

The challenge becomes:

```text
How much consistency should we guarantee?
```

---

# Rejected Approach

True Historical Snapshots

Examples:

* MVCC browsing sessions
* Versioned product history
* Historical row reconstruction

Advantages:

```text
Strong consistency.
```

Disadvantages:

```text
High implementation complexity.
```

Far beyond expected scope of a 3-4 hour task.

---

# Chosen Consistency Model

Guarantees:

* Stable deterministic ordering
* No OFFSET-based duplication
* Robust insertion handling
* Efficient traversal

Known Limitation:

Products updated during active browsing may move above the user's cursor position.

This is explicitly documented as a tradeoff.

---

# Database Design

Table:

```text
products
```

Fields:

```text
id
name
category
price
created_at
updated_at
```

Purposefully minimal.

Assignment does not require:

```text
Users
Sessions
Auth
Roles
```

Therefore omitted.

---

# Why PostgreSQL

Reasons:

### Excellent Indexing

Supports:

```text
B-tree indexes
Composite indexes
```

which are ideal for cursor pagination.

---

### Mature Query Planner

Can efficiently use:

```sql
WHERE category = ?
ORDER BY updated_at DESC, id DESC
```

with proper indexing.

---

### Easy Hosting

Supported by:

* Supabase
* Neon

Both suggested by assignment.

---

# Index Design

Chosen Index:

```sql
(category,
 updated_at DESC,
 id DESC)
```

---

# Why Not Category Only?

Would help:

```sql
WHERE category = ?
```

But not:

```sql
ORDER BY updated_at
```

Database would still sort.

---

# Why Not updated_at Only?

Would help ordering.

But database would still scan many categories.

---

# Why Composite Index Wins

Matches actual query:

```sql
WHERE category=?
ORDER BY updated_at DESC, id DESC
```

The closer index order matches query order:

```text
Less work PostgreSQL performs.
```

---

# Query Design

## First Page

```sql
SELECT *
FROM products
WHERE category = ?
ORDER BY updated_at DESC, id DESC
LIMIT 21;
```

---

## Next Page

Cursor:

```text
(updated_at, id)
```

Query:

```sql
SELECT *
FROM products
WHERE category = ?
AND (
      updated_at < cursor_time
      OR
      (
          updated_at = cursor_time
          AND id < cursor_id
      )
)
ORDER BY updated_at DESC,
         id DESC
LIMIT 21;
```

---

# Why The Cursor Condition Works

We are asking:

```text
Give me products after this position.
```

A row comes after cursor if:

```text
Older timestamp
```

OR

```text
Same timestamp
Smaller ID
```

This exactly mirrors our ordering.

---

# API Philosophy

Backend should remain stateless.

Avoid:

```text
Server-side pagination sessions.
```

Avoid:

```text
User state stored in memory.
```

Instead:

Frontend stores:

```text
cursor
```

Backend simply receives it.

This scales naturally.

---

# Request Lifecycle

First Request:

```text
Frontend
   |
   v
GET /products?category=Books
```

Backend:

```text
Query DB
Build cursor
Return response
```

---

Subsequent Requests:

```text
Frontend
   |
   v
GET /products?cursor=...
```

Backend:

```text
Decode cursor
Run cursor query
Return next page
```

---

# has_more Design

Question:

```text
How do we know whether
another page exists?
```

Rejected:

```sql
COUNT(*)
```

Reason:

Unnecessary.

---

Chosen:

Fetch:

```text
page_size + 1
```

rows.

Example:

```text
21 rows
```

for a page size of:

```text
20
```

If extra row exists:

```json
{
  "has_more": true
}
```

Otherwise:

```json
{
  "has_more": false
}
```

---

# Scalability Discussion

Dataset:

```text
200,000 products
```

This is not massive.

However it is large enough that:

```text
Poor pagination strategy
```

becomes noticeable.

The chosen design scales significantly beyond assignment size.

Millions of rows remain feasible with proper indexing.

---

# Future Improvements

If product requirements evolved:

### Strong Snapshot Consistency

Implement:

```text
Versioned products
```

or

```text
Historical snapshots
```

---

### Cursor Signing

Prevent cursor tampering.

---

### Redis Cache

For hot categories.

---

### Read Replicas

For heavy read workloads.

---

### Search Support

Add:

```text
name search
brand search
```

with dedicated indexes.

---

# Interview Defense Summary

If asked:

Why cursor pagination?

Answer:

```text
OFFSET becomes slower as page depth increases and can create duplicate or missing records when data changes. Cursor pagination uses position-based traversal, works efficiently with indexes, and provides stable navigation through large datasets.
```

If asked:

Why updated_at + id?

Answer:

```text
updated_at alone is not unique. id provides deterministic ordering and enables reliable cursor pagination.
```

If asked:

Why composite index?

Answer:

```text
The index mirrors the query pattern. PostgreSQL can filter by category and read rows in the required order without performing expensive sorting.
```

If asked:

What would you improve?

Answer:

```text
Introduce stronger snapshot consistency through versioned records or snapshot isolation, at the cost of additional complexity.
```

# End of Engineering Design Document
