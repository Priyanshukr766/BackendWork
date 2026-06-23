/**
 * app.js — Express Application Setup
 *
 * Purpose:
 *   Creates and configures the Express app instance.
 *   This is the central hub where middleware and routes are registered.
 *
 * Responsibilities:
 *   - Load environment variables from .env
 *   - Initialise the database connection pool (via db.js)
 *   - Register global middleware (JSON body parser)
 *   - Mount API routes
 *   - Expose the configured app for server.js to start
 *
 * Note:
 *   This file does NOT call app.listen().
 *   That is done in server.js — keeping app creation separate from server startup
 *   makes the app easier to test without actually binding to a port.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';

// __dirname polyfill for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialise DB pool — triggers connection test on startup
import './config/db.js';

// Routes
import productRoutes from './routes/products.routes.js';

const app = express();

// CORS — allow requests from the frontend origin
// Set CORS_ORIGIN in Render env vars to your deployed frontend URL
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5174',
}));

// Parse JSON bodies
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Product API
app.use('/api/products', productRoutes);

export default app;
