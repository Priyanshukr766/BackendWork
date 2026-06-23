/**
 * products.repository.js — Product Database Access Layer
 *
 * Purpose:
 *   The only place in the application that talks directly to the database.
 *   Executes the two SQL queries needed for cursor-based pagination.
 *
 * Responsibilities:
 *   - getFirstPage(category)               — Fetches the first page (no cursor)
 *   - getNextPage(category, updatedAt, id) — Fetches subsequent pages using cursor values
 *
 * Query Strategy:
 *   Both queries fetch PAGE_SIZE + 1 rows (21 instead of 20).
 *   The extra row lets the service layer determine has_more without a COUNT(*) query.
 *
 *   First page query:
 *     WHERE category = $1
 *     ORDER BY updated_at DESC, id DESC
 *     LIMIT 21
 *
 *   Cursor query:
 *     WHERE category = $1
 *       AND (updated_at < $2 OR (updated_at = $2 AND id < $3))
 *     ORDER BY updated_at DESC, id DESC
 *     LIMIT 21
 *
 *   The cursor condition mirrors the ORDER BY exactly:
 *     A row comes AFTER the cursor if:
 *       - Its updated_at is older (smaller), OR
 *       - Its updated_at is the same but its id is smaller (tiebreaker)
 *
 * Index used:
 *   idx_products_category_updated_id ON products(category, updated_at DESC, id DESC)
 *   This composite index lets PostgreSQL filter by category AND read rows in
 *   the required order without a separate sort step.
 *
 * Rules:
 *   - No business logic here — only raw SQL execution
 *   - Returns raw pg row objects to the service layer
 */

import pool from '../config/db.js';

// Number of rows to fetch per page + 1 extra to detect has_more
const FETCH_LIMIT = 21;

/**
 * Fetches the first page of products for a given category.
 * No cursor required — starts from the very top of the ordered result set.
 *
 * @param {string} category
 * @returns {Promise<object[]>} Array of raw product rows (up to 21)
 */
export async function getFirstPage(category) {
  const query = `
    SELECT id, name, category, price, created_at, updated_at
    FROM products
    WHERE category = $1
    ORDER BY updated_at DESC, id DESC
    LIMIT $2
  `;

  const { rows } = await pool.query(query, [category, FETCH_LIMIT]);
  return rows;
}

/**
 * Fetches the next page of products after the given cursor position.
 *
 * The cursor encodes the (updated_at, id) of the last product seen on the previous page.
 * The query returns only products that appear AFTER that position in the ordering.
 *
 * @param {string} category
 * @param {string} updatedAt  — ISO timestamp from the cursor
 * @param {number} id         — Product ID from the cursor
 * @returns {Promise<object[]>} Array of raw product rows (up to 21)
 */
export async function getNextPage(category, updatedAt, id) {
  const query = `
    SELECT id, name, category, price, created_at, updated_at
    FROM products
    WHERE category = $1
      AND (
        updated_at < $2
        OR (updated_at = $2 AND id < $3)
      )
    ORDER BY updated_at DESC, id DESC
    LIMIT $4
  `;

  const { rows } = await pool.query(query, [category, updatedAt, id, FETCH_LIMIT]);
  return rows;
}
