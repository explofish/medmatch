/**
 * Response Compression Middleware
 *
 * Compresses JSON responses to reduce bandwidth and improve performance.
 * Uses a simple compression for JSON responses when they exceed a threshold.
 */

const COMPRESSION_THRESHOLD = 1024; // 1KB threshold for compression

/**
 * Simple JSON compression by removing whitespace
 * For production, consider using zlib/gzip via a reverse proxy (nginx, etc.)
 */
function compressJson(data) {
  if (typeof data === 'string') {
    return data.replace(/\s+/g, ' ').trim();
  }
  return JSON.stringify(data);
}

/**
 * Calculate approximate size of JSON data in bytes
 */
function getJsonSize(data) {
  if (typeof data === 'string') {
    return Buffer.byteLength(data, 'utf8');
  }
  return Buffer.byteLength(JSON.stringify(data), 'utf8');
}

/**
 * Compression middleware
 */
function compression(req, res, next) {
  // Store original json method
  const originalJson = res.json.bind(res);

  // Override res.json to add compression
  res.json = function (data) {
    // Set content-type if not already set
    if (!res.get('Content-Type')) {
      res.set('Content-Type', 'application/json');
    }

    // Add compression headers
    res.set('X-Compression', 'available');

    // Check response size and compress if needed
    const size = getJsonSize(data);

    if (size > COMPRESSION_THRESHOLD) {
      // For large responses, remove whitespace from JSON
      const compressed = compressJson(data);
      res.set('X-Compressed', 'true');
      res.set('X-Original-Size', size.toString());
      res.set('X-Compressed-Size', Buffer.byteLength(compressed, 'utf8').toString());

      // Send compressed response
      return res.send(compressed);
    }

    // For small responses, send as-is
    return originalJson(data);
  };

  next();
}

module.exports = compression;
