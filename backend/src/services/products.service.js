/**
 * products.service.js — Product Business Logic
 *
 * Purpose:
 *   Contains all business logic for the product browsing feature.
 *   Sits between the controller (HTTP layer) and the repository (DB layer).
 *
 * Responsibilities:
 *   - Decode the incoming cursor (if provided) using cursor.js utilities
 *   - Decide whether to call getFirstPage or getNextPage on the repository
 *   - Determine has_more by checking if rows.length > PAGE_SIZE
 *   - Build the next_cursor from the last returned product
 *   - Shape and return the final API response object
 *
 * Rules:
 *   - No SQL here — all DB access goes through the repository layer
 *   - No HTTP here — no access to req/res objects
 *
 * Response shape:
 *   {
 *     products   : Product[]   — the page of products (max PAGE_SIZE)
 *     next_cursor: string|null — encoded cursor pointing to the next page, null if no more
 *     has_more   : boolean     — true if another page exists after this one
 *   }
 */

import { getFirstPage, getNextPage } from '../repositories/products.repository.js';
import { encodeCursor, decodeCursor } from '../utils/cursor.js';

// Number of products to return per page
const PAGE_SIZE = 20;

/**
 * Fetches a page of products for the given category.
 *
 * Flow:
 *   1. If a cursor string is provided → decode it → call getNextPage
 *   2. If no cursor → call getFirstPage
 *   3. Fetch PAGE_SIZE + 1 rows to detect has_more without a COUNT query
 *   4. Slice back to PAGE_SIZE for the response
 *   5. Build next_cursor from the last product in the page
 *
 * @param {string}           category — The product category to filter by
 * @param {string|undefined} cursor   — Optional Base64-encoded cursor from the previous page
 * @returns {Promise<{ products: object[], next_cursor: string|null, has_more: boolean }>}
 */
export async function getProducts(category, cursor) {
  let rows;

  if (cursor) {
    // Subsequent page — decode cursor to get position in the ordering
    const decoded = decodeCursor(cursor);

    if (!decoded) {
      // Cursor was provided but is malformed — signal to controller to return 400
      throw new Error('INVALID_CURSOR');
    }

    rows = await getNextPage(category, decoded.updatedAt, decoded.id);
  } else {
    // First page — no cursor needed
    rows = await getFirstPage(category);
  }

  // Determine if another page exists:
  // We fetched PAGE_SIZE + 1 rows. If we got more than PAGE_SIZE, there is a next page.
  const hasMore = rows.length > PAGE_SIZE;

  // Slice back to PAGE_SIZE — the 21st row was only used to check has_more
  const products = rows.slice(0, PAGE_SIZE);

  // Build the cursor for the next page using the last product in this page
  // If this is the last page (has_more = false), next_cursor is null
  const lastProduct = products[products.length - 1];
  const nextCursor = hasMore && lastProduct
    ? encodeCursor({ updatedAt: lastProduct.updated_at, id: lastProduct.id })
    : null;

  return {
    products,
    next_cursor: nextCursor,
    has_more: hasMore,
  };
}
