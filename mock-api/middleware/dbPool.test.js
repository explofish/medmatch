/**
 * Database Connection Pool Tests
 * 
 * @jest-environment node
 */

const path = require('path');
const fs = require('fs');
const { ConnectionPool, getPool, resetPool } = require('./dbPool');

describe('ConnectionPool', () => {
  let pool;
  const testDbPath = path.join(__dirname, '.data-test', 'test-pool.db');

  beforeEach(() => {
    // Clean up any existing test database
    const testDir = path.dirname(testDbPath);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch (e) {}
    }
    
    pool = new ConnectionPool({
      dbPath: testDbPath,
      maxConnections: 2,
      idleTimeoutMs: 500,
      connectionTimeoutMs: 1000
    });
  });

  afterEach(async () => {
    if (pool) {
      await pool.shutdown();
      pool = null;
    }
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch (e) {}
    }
  });

  describe('Constructor', () => {
    test('should create pool with default options', () => {
      const defaultPool = new ConnectionPool();
      expect(defaultPool.maxConnections).toBe(5);
      expect(defaultPool.idleTimeoutMs).toBe(300000);
      expect(defaultPool.pool).toEqual([]);
      expect(defaultPool.inUse.size).toBe(0);
      clearInterval(defaultPool.cleanupInterval);
    });

    test('should create pool with custom options', () => {
      expect(pool.maxConnections).toBe(2);
      expect(pool.idleTimeoutMs).toBe(500);
      expect(pool.connectionTimeoutMs).toBe(1000);
    });

    test('should create data directory if not exists', () => {
      const newDbPath = path.join(__dirname, '.data-test-new', 'new.db');
      const newPool = new ConnectionPool({ dbPath: newDbPath });
      expect(fs.existsSync(path.dirname(newDbPath))).toBe(true);
      clearInterval(newPool.cleanupInterval);
      // Cleanup
      try { fs.rmdirSync(path.dirname(newDbPath), { recursive: true }); } catch (e) {}
    });
  });

  describe('Connection Management', () => {
    test('should acquire and release connection', async () => {
      const conn = await pool.acquire();
      expect(conn).toBeDefined();
      expect(pool.inUse.has(conn)).toBe(true);
      
      pool.release(conn);
      expect(pool.inUse.has(conn)).toBe(false);
      expect(pool.pool.length).toBe(1);
    });

    test('should reuse released connection', async () => {
      const conn1 = await pool.acquire();
      pool.release(conn1);
      
      const conn2 = await pool.acquire();
      expect(conn1).toBe(conn2);
      pool.release(conn2);
    });

    test('should warn on releasing connection not in use', () => {
      const mockConn = {};
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      pool.release(mockConn);
      expect(consoleSpy).toHaveBeenCalledWith('Attempted to release connection not in use');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Query Operations', () => {
    test('should execute query', async () => {
      await pool.run('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, name TEXT)');
      await pool.run("INSERT INTO test (name) VALUES ('test1')");
      
      const rows = await pool.query('SELECT * FROM test');
      expect(rows.length).toBe(1);
      expect(rows[0].name).toBe('test1');
    });

    test('should execute queryOne for single row', async () => {
      await pool.run('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, name TEXT)');
      await pool.run("INSERT INTO test (name) VALUES ('single')");
      
      const row = await pool.queryOne('SELECT * FROM test WHERE name = ?', ['single']);
      expect(row).toBeDefined();
      expect(row.name).toBe('single');
    });

    test('should execute run for write operations', async () => {
      await pool.run('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, name TEXT)');
      const result = await pool.run("INSERT INTO test (name) VALUES ('inserted')");
      
      expect(result).toHaveProperty('lastID');
      expect(result).toHaveProperty('changes');
      expect(result.changes).toBe(1);
    });

    test('should handle query errors', async () => {
      await expect(pool.query('INVALID SQL')).rejects.toThrow();
    });
  });

  describe('Connection Health', () => {
    test('should check if connection is alive', async () => {
      const conn = await pool.createConnection();
      const isAlive = await pool.checkConnection(conn);
      expect(isAlive).toBe(true);
      await pool.closeConnection(conn);
    });

    test('should detect dead connection', async () => {
      const conn = await pool.createConnection();
      await pool.closeConnection(conn);
      
      const isAlive = await pool.checkConnection(conn);
      expect(isAlive).toBe(false);
    });
  });

  describe('Pool Statistics', () => {
    test('should get pool stats', async () => {
      const stats = pool.getStats();
      expect(stats).toHaveProperty('totalCreated');
      expect(stats).toHaveProperty('totalClosed');
      expect(stats).toHaveProperty('currentConnections');
      expect(stats).toHaveProperty('available');
      expect(stats).toHaveProperty('inUse');
      expect(stats).toHaveProperty('waiting');
      expect(stats).toHaveProperty('utilization');
    });

    test('should track peak connections', async () => {
      const conn1 = await pool.acquire();
      const conn2 = await pool.acquire();
      
      const stats = pool.getStats();
      expect(stats.peakConnections).toBeGreaterThanOrEqual(2);
      
      pool.release(conn1);
      pool.release(conn2);
    });
  });

  describe('Shutdown', () => {
    test('should shutdown gracefully', async () => {
      const conn = await pool.acquire();
      pool.release(conn);
      
      await pool.shutdown();
      
      expect(pool.pool.length).toBe(0);
      expect(pool.inUse.size).toBe(0);
    });
  });
});

describe('getPool Singleton', () => {
  test('should return same pool instance', () => {
    resetPool();
    
    const pool1 = getPool({ maxConnections: 5 });
    const pool2 = getPool({ maxConnections: 10 });
    
    expect(pool1).toBe(pool2);
    
    // Cleanup
    if (pool1 && pool1.cleanupInterval) {
      clearInterval(pool1.cleanupInterval);
    }
  });

  test('should create new pool after reset', () => {
    resetPool();
    const pool1 = getPool();
    
    // Save interval before reset
    const interval1 = pool1.cleanupInterval;
    
    resetPool();
    const pool2 = getPool();
    
    expect(pool1).not.toBe(pool2);
    
    // Cleanup both intervals
    if (interval1) clearInterval(interval1);
    if (pool2 && pool2.cleanupInterval) clearInterval(pool2.cleanupInterval);
  });
});

describe('resetPool', () => {
  test('should reset pool to null', () => {
    const pool = getPool();
    expect(pool).toBeDefined();
    
    const interval = pool.cleanupInterval;
    resetPool();
    
    const newPool = getPool();
    expect(newPool).not.toBe(pool);
    
    // Cleanup intervals
    if (interval) clearInterval(interval);
    if (newPool && newPool.cleanupInterval) clearInterval(newPool.cleanupInterval);
  });
});
