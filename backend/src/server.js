/**
 * server.js — HTTP Server Entry Point
 *
 * Purpose:
 *   Starts the HTTP server by calling app.listen().
 *   This is the file Node.js executes to run the application.
 *
 * Why separate from app.js?
 *   Keeping the Express app creation (app.js) separate from server startup (server.js)
 *   allows the app to be imported in tests without binding to a real port.
 *
 * Usage:
 *   Always run from the backend/ directory:
 *     node src/server.js
 */

import app from './app.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
