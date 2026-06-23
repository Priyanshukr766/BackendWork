/**
 * generateProducts.js — Database Seed Script
 *
 * Purpose:
 *   Populates the products table with 200,000 realistic-looking test products.
 *   Intended to be run once before development or demos.
 *
 * Strategy:
 *   Uses batch inserts (1,000 rows per batch) instead of one insert per row.
 *   Inserting 200,000 rows one at a time would be extremely slow due to
 *   per-round-trip overhead. Batching reduces DB round trips from 200,000 to 200.
 *
 * Data Characteristics:
 *   - name      : "Product-1", "Product-2", ... "Product-200000"
 *   - category  : random from [Electronics, Books, Fashion, Home, Sports, Beauty, Toys, Automotive]
 *   - price     : random decimal between 10.00 and 1000.00
 *   - created_at: random timestamp within the past year
 *   - updated_at: created_at + random offset (0–30 days)
 *
 * Usage:
 *   Run from the backend/ directory:
 *     node src/seed/generateProducts.js
 */

import pool from '../config/db.js';

// ─── Configuration ────────────────────────────────────────────────────────────

const TOTAL_PRODUCTS = 200_000;
const BATCH_SIZE     = 1_000;

const CATEGORIES = [
  'Electronics',
  'Books',
  'Fashion',
  'Home',
  'Sports',
  'Beauty',
  'Toys',
  'Automotive',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns a random element from an array */
function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Returns a random float between min and max, rounded to 2 decimal places */
function randomPrice(min = 10, max = 1000) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

/**
 * Returns a random Date within the past year.
 * Spread across the full year so updated_at ordering is meaningful.
 */
function randomPastDate() {
  const now  = Date.now();
  const year = 365 * 24 * 60 * 60 * 1000;
  return new Date(now - Math.random() * year);
}

/**
 * Returns a date that is created_at + a random 0–30 day offset.
 * Capped at now so updated_at is never in the future.
 */
function randomUpdatedAt(createdAt) {
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const updated    = new Date(createdAt.getTime() + Math.random() * thirtyDays);
  return updated > new Date() ? new Date() : updated;
}

// ─── Batch Insert ─────────────────────────────────────────────────────────────

/**
 * Inserts a batch of products using a single multi-row INSERT statement.
 * Builds parameterized placeholders: ($1,$2,$3,...), ($6,$7,$8,...) etc.
 *
 * @param {object[]} batch — Array of product objects to insert
 */
async function insertBatch(batch) {
  const COLS = 5; // name, category, price, created_at, updated_at
  const values = [];
  const placeholders = batch.map((product, i) => {
    const base = i * COLS;
    values.push(
      product.name,
      product.category,
      product.price,
      product.created_at,
      product.updated_at,
    );
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
  });

  const query = `
    INSERT INTO products (name, category, price, created_at, updated_at)
    VALUES ${placeholders.join(', ')}
  `;

  await pool.query(query, values);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log(`Seeding ${TOTAL_PRODUCTS.toLocaleString()} products in batches of ${BATCH_SIZE}...`);
  const startTime = Date.now();

  const totalBatches = Math.ceil(TOTAL_PRODUCTS / BATCH_SIZE);

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    // Build the batch in memory
    const batch = [];
    const startId = batchIndex * BATCH_SIZE + 1;
    const endId   = Math.min(startId + BATCH_SIZE - 1, TOTAL_PRODUCTS);

    for (let i = startId; i <= endId; i++) {
      const createdAt = randomPastDate();
      batch.push({
        name      : `Product-${i}`,
        category  : randomFrom(CATEGORIES),
        price     : randomPrice(),
        created_at: createdAt,
        updated_at: randomUpdatedAt(createdAt),
      });
    }

    // Insert the batch
    await insertBatch(batch);

    // Progress log every 10 batches (every 10,000 rows)
    if ((batchIndex + 1) % 10 === 0 || batchIndex === totalBatches - 1) {
      const inserted = Math.min((batchIndex + 1) * BATCH_SIZE, TOTAL_PRODUCTS);
      const elapsed  = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  Inserted ${inserted.toLocaleString()} / ${TOTAL_PRODUCTS.toLocaleString()} (${elapsed}s)`);
    }
  }

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nDone! ${TOTAL_PRODUCTS.toLocaleString()} products inserted in ${totalElapsed}s`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
