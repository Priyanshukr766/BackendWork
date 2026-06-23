/**
 * products.routes.js — Product API Route Definitions
 *
 * Purpose:
 *   Maps HTTP endpoints to their controller handler functions.
 *   This file only defines routes — no business logic or SQL lives here.
 *
 * Routes:
 *   GET /api/products   — Fetch a paginated page of products
 *                         Query params: category (required), cursor (optional)
 *
 * Mounted in app.js at: /api/products
 */

import { Router } from 'express';
import { getProductsHandler } from '../controllers/products.controller.js';

const router = Router();

// GET /api/products?category=Books
// GET /api/products?category=Books&cursor=<encoded_cursor>
router.get('/', getProductsHandler);

export default router;
