/**
 * cursor.js — Cursor Utilities
 *
 * Purpose:
 *   Encodes and decodes pagination cursors used by the cursor (keyset) pagination system.
 *
 * Why cursors?
 *   Instead of passing a page number, the client passes a cursor that encodes
 *   the exact position in the result set (updated_at + id of the last seen product).
 *   The backend uses this to fetch only rows that come after that position.
 *
 * Cursor Format:
 *   Raw payload  : { updatedAt: "<ISO timestamp>", id: <number> }
 *   Encoded form : Base64(JSON.stringify(payload))
 *
 * Exports:
 *   encodeCursor(data)   — Converts a cursor payload object to a Base64 string
 *   decodeCursor(cursor) — Converts a Base64 string back to a cursor payload object
 *                          Returns null if the cursor is missing, malformed, or invalid
 */

/**
 * Encodes a cursor payload into a Base64 string safe to pass as a query parameter.
 *
 * @param {{ updatedAt: string, id: number }} data
 * @returns {string} Base64-encoded cursor string
 */
export function encodeCursor(data) {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

/**
 * Decodes a Base64 cursor string back into a cursor payload object.
 * Returns null if the cursor is absent, not valid Base64, or missing required fields.
 *
 * @param {string | undefined} cursor
 * @returns {{ updatedAt: string, id: number } | null}
 */
export function decodeCursor(cursor) {
  if (!cursor) return null;

  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));

    // Validate required fields are present
    if (!decoded.updatedAt || !decoded.id) return null;

    return decoded;
  } catch {
    // Malformed Base64 or invalid JSON
    return null;
  }
}
