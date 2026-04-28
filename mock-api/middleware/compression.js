/**
 * Response Compression Middleware
 * Provides gzip/deflate compression for API responses
 * Reduces bandwidth usage and improves response times
 */

const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);
const deflate = promisify(zlib.deflate);
const brotliCompress = promisify(zlib.brotliCompress);

// Compression configuration
const DEFAULT_OPTIONS = {
  // Minimum size to compress (bytes)
  threshold: 1024,
  
  // Compression level (1-9, where 9 is best compression but slowest)
  level: 6,
  
  // MIME types to compress
  filter: (contentType) => {
    const compressibleTypes = [
      'text/',
      'application/json',
      'application/javascript',
      'application/xml',
      'application/rss+xml',
      'application/atom+xml',
      'image/svg+xml'
    ];
    return compressibleTypes.some(type => contentType && contentType.includes(type));
  }
};

/**
 * Compress response middleware
 * Supports gzip, deflate, and brotli (if available)
 */
function compression(options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return async (req, res, next) => {
    // Skip if client doesn't accept encoding
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const encodings = acceptEncoding.toLowerCase().split(',').map(e => e.trim());
    
    // Determine best encoding
    let encoding = null;
    let compressFn = null;
    
    // Prefer brotli > gzip > deflate
    if (zlib.brotliCompress && encodings.includes('br')) {
      encoding = 'br';
      compressFn = brotliCompress;
    } else if (encodings.includes('gzip')) {
      encoding = 'gzip';
      compressFn = gzip;
    } else if (encodings.includes('deflate')) {
      encoding = 'deflate';
      compressFn = deflate;
    }

    if (!encoding) {
      return next();
    }

    // Store original methods
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);
    const originalJson = res.json.bind(res);

    let buffer = Buffer.alloc(0);
    const shouldCompress = false;

    // Override write
    res.write = function(chunk, encoding) {
      if (chunk) {
        buffer = Buffer.concat([buffer, Buffer.from(chunk, encoding)]);
      }
      return true;
    };

    // Override end
    res.end = async function(chunk, encoding) {
      if (chunk) {
        buffer = Buffer.concat([buffer, Buffer.from(chunk, encoding)]);
      }

      // Check if we should compress
      const contentType = res.getHeader('Content-Type') || 'application/json';
      const contentLength = buffer.length;

      if (contentLength < opts.threshold || !opts.filter(contentType)) {
        // Don't compress - restore original behavior
        res.write = originalWrite;
        res.end = originalEnd;
        return originalEnd(buffer);
      }

      try {
        // Compress the response
        const compressed = await compressFn(buffer, {
          level: opts.level,
          // Brotli options
          params: encoding === 'br' ? {
            [zlib.constants.BROTLI_PARAM_QUALITY]: opts.level,
            [zlib.constants.BROTLI_PARAM_SIZE_HINT]: contentLength
          } : undefined
        });

        // Set compression headers
        res.setHeader('Content-Encoding', encoding);
        res.setHeader('Vary', 'Accept-Encoding');
        res.removeHeader('Content-Length'); // Length changes after compression
        
        // Calculate and log compression ratio
        const ratio = ((contentLength - compressed.length) / contentLength * 100).toFixed(1);
        res.setHeader('X-Compression-Ratio', `${ratio}%`);

        // Restore original methods and send compressed response
        res.write = originalWrite;
        res.end = originalEnd;
        return originalEnd(compressed);
      } catch (err) {
        // Compression failed - send uncompressed
        res.write = originalWrite;
        res.end = originalEnd;
        return originalEnd(buffer);
      }
    };

    // Override json to buffer responses
    res.json = function(body) {
      const json = JSON.stringify(body);
      res.setHeader('Content-Type', 'application/json');
      return res.end(json);
    };

    next();
  };
}

/**
 * Quick compression middleware (no async)
 * Uses synchronous compression for smaller payloads
 */
function compressionSync(options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return (req, res, next) => {
    const acceptEncoding = req.headers['accept-encoding'] || '';
    
    if (!acceptEncoding.includes('gzip') && !acceptEncoding.includes('deflate')) {
      return next();
    }

    const encoding = acceptEncoding.includes('gzip') ? 'gzip' : 'deflate';
    const compressFn = encoding === 'gzip' ? zlib.gzipSync : zlib.deflateSync;

    const originalEnd = res.end.bind(res);
    const originalJson = res.json.bind(res);

    res.json = function(body) {
      const json = JSON.stringify(body);
      res.setHeader('Content-Type', 'application/json');
      return res.end(json);
    };

    res.end = function(chunk, encoding) {
      if (chunk) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding);
        
        const contentType = res.getHeader('Content-Type') || '';
        
        if (buffer.length < opts.threshold || !opts.filter(contentType)) {
          return originalEnd(chunk, encoding);
        }

        try {
          const compressed = compressFn(buffer, { level: opts.level });
          res.setHeader('Content-Encoding', encoding);
          res.setHeader('Vary', 'Accept-Encoding');
          res.removeHeader('Content-Length');
          
          const ratio = ((buffer.length - compressed.length) / buffer.length * 100).toFixed(1);
          res.setHeader('X-Compression-Ratio', `${ratio}%`);
          
          return originalEnd(compressed);
        } catch (err) {
          return originalEnd(chunk, encoding);
        }
      }
      return originalEnd();
    };

    next();
  };
}

module.exports = {
  compression,
  compressionSync,
  DEFAULT_OPTIONS
};
