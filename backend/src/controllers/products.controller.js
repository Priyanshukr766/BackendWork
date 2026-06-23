/**
 * products.controller.js — Product Request Handler
 *
 * Purpose:
 *   Handles incoming HTTP requests for the GET /api/products endpoint.
 *   Reads and validates query parameters, calls the service layer,
 *   and sends the JSON response back to the client.
 *
 * Responsibilities:
 *   - Read  : category and cursor from req.query
 *   - Validate : return 400 if category is missing or cursor causes INVALID_CURSOR error
 *   - Delegate : call getProducts() from the service layer
 *   - Respond  : send JSON { products, next_cursor, has_more }
 *   - Handle errors : return 500 for unexpected database or server failures
 *
 * Rules:
 *   - No SQL here — all DB access goes through the service → repository layers
 *   - No business logic here — only request/response handling
 */

import { getProducts } from '../services/products.service.js';

/**
 * GET /api/products
 *
 * Query parameters:
 *   category (required) — filter products by this category
 *   cursor   (optional) — Base64-encoded cursor from a previous response
 *
 * Success response (200):
 *   { products: [...], next_cursor: "...", has_more: true|false }
 *
 * Error responses:
 *   400 — missing category or invalid cursor
 *   500 — unexpected server or database error
 */
export async function getProductsHandler(req, res) {
  const { category, cursor } = req.query;

  // Validate: category is required
  if (!category || category.trim() === '') {
    return res.status(400).json({
      error: 'category query parameter is required',
    });
  }

  try {
    const result = await getProducts(category.trim(), cursor);
    return res.status(200).json(result);
  } catch (err) {
    // Invalid cursor detected by the service layer
    if (err.message === 'INVALID_CURSOR') {
      return res.status(400).json({
        error: 'Invalid cursor — it may be malformed or expired',
      });
    }

    // Unexpected error (DB failure, etc.)
    console.error('Unexpected error in getProductsHandler:', err);
    return res.status(500).json({
      error: 'Internal server error',
    });
  }
}
