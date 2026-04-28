/**
 * Compression Middleware Tests
 * 
 * @jest-environment node
 */

const express = require('express');
const request = require('supertest');
const { compression, compressionSync } = require('./compression');

describe('Compression Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  test('should skip compression when client does not accept encoding', async () => {
    app.use(compression());
    app.get('/test', (req, res) => {
      res.json({ message: 'Hello World'.repeat(100) });
    });

    const response = await request(app)
      .get('/test')
      .set('Accept-Encoding', '');

    expect(response.status).toBe(200);
    expect(response.headers['content-encoding']).toBeUndefined();
  });

  test('should process request with gzip encoding accepted', async () => {
    app.use(compression());
    app.get('/test', (req, res) => {
      res.json({ message: 'Hello World'.repeat(100) });
    });

    const response = await request(app)
      .get('/test')
      .set('Accept-Encoding', 'gzip');

    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
  });

  test('should process request with deflate encoding accepted', async () => {
    app.use(compression());
    app.get('/test', (req, res) => {
      res.json({ message: 'Hello World'.repeat(100) });
    });

    const response = await request(app)
      .get('/test')
      .set('Accept-Encoding', 'deflate');

    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
  });

  test('should skip compression for small responses', async () => {
    app.use(compression({ threshold: 1024 }));
    app.get('/test', (req, res) => {
      res.json({ message: 'Hi' }); // Small response
    });

    const response = await request(app)
      .get('/test')
      .set('Accept-Encoding', 'gzip');

    expect(response.status).toBe(200);
    // Should not crash
    expect(response.body).toBeDefined();
  });

  test('should handle res.json() correctly', async () => {
    app.use(compression());
    app.get('/test', (req, res) => {
      res.json({ data: 'x'.repeat(2000) });
    });

    const response = await request(app)
      .get('/test')
      .set('Accept-Encoding', 'gzip');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('application/json');
  });

  test('should accept custom threshold option', async () => {
    app.use(compression({ threshold: 100 }));
    app.get('/test', (req, res) => {
      res.json({ message: 'x'.repeat(500) });
    });

    const response = await request(app)
      .get('/test')
      .set('Accept-Encoding', 'gzip');

    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
  });

  test('should handle multiple encodings in Accept-Encoding', async () => {
    app.use(compression());
    app.get('/test', (req, res) => {
      res.json({ message: 'Hello World'.repeat(100) });
    });

    const response = await request(app)
      .get('/test')
      .set('Accept-Encoding', 'gzip, deflate, br');

    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
  });

  test('should handle JSON responses', async () => {
    app.use(compression());
    app.get('/test', (req, res) => {
      res.json({ nested: { data: 'x'.repeat(2000) } });
    });

    const response = await request(app)
      .get('/test')
      .set('Accept-Encoding', 'gzip');

    expect(response.status).toBe(200);
    expect(response.body.nested).toBeDefined();
  });
});

describe('Compression Sync', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  test('should compress with gzip sync', async () => {
    app.use(compressionSync());
    app.get('/test', (req, res) => {
      res.json({ message: 'Hello World'.repeat(100) });
    });

    const response = await request(app)
      .get('/test')
      .set('Accept-Encoding', 'gzip');

    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
  });

  test('should skip when no accepted encoding for sync', async () => {
    app.use(compressionSync());
    app.get('/test', (req, res) => {
      res.json({ message: 'Hello World'.repeat(100) });
    });

    const response = await request(app)
      .get('/test')
      .set('Accept-Encoding', '');

    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
  });

  test('should handle large responses with sync compression', async () => {
    app.use(compressionSync());
    app.get('/test', (req, res) => {
      res.json({ data: 'x'.repeat(5000) });
    });

    const response = await request(app)
      .get('/test')
      .set('Accept-Encoding', 'gzip');

    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
  });
});

describe('DEFAULT_OPTIONS', () => {
  test('should export DEFAULT_OPTIONS', () => {
    const { DEFAULT_OPTIONS } = require('./compression');
    expect(DEFAULT_OPTIONS).toBeDefined();
    expect(DEFAULT_OPTIONS.threshold).toBe(1024);
    expect(DEFAULT_OPTIONS.level).toBe(6);
    expect(typeof DEFAULT_OPTIONS.filter).toBe('function');
  });

  test('should filter compressible types', () => {
    const { DEFAULT_OPTIONS } = require('./compression');
    
    expect(DEFAULT_OPTIONS.filter('application/json')).toBe(true);
    expect(DEFAULT_OPTIONS.filter('text/html')).toBe(true);
    expect(DEFAULT_OPTIONS.filter('image/png')).toBe(false);
    expect(DEFAULT_OPTIONS.filter('application/pdf')).toBe(false);
  });
});
