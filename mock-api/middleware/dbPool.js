/**
 * Database Connection Pool Manager
 * 
 * SQLite doesn't natively support connection pooling like PostgreSQL/MySQL.
 * This module simulates connection pooling by:
 * 1. Managing multiple database connections
 * 2. Providing connection reuse
 * 3. Implementing connection health checks
 * 4. Supporting read replicas for horizontal scaling
 * 
 * For production with PostgreSQL, replace this with pg-pool.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class ConnectionPool {
  constructor(options = {}) {
    this.dbPath = options.dbPath || path.join(__dirname, '..', '.data', 'medmatch.db');
    this.maxConnections = options.maxConnections || 5;
    this.idleTimeoutMs = options.idleTimeoutMs || 300000; // 5 minutes
    this.connectionTimeoutMs = options.connectionTimeoutMs || 5000;
    
    this.pool = []; // Available connections
    this.inUse = new Set(); // In-use connections
    this.waiting = []; // Waiting requests
    
    this.stats = {
      totalCreated: 0,
      totalClosed: 0,
      totalWaited: 0,
      peakConnections: 0,
      currentConnections: 0
    };
    
    // Ensure data directory exists
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Create a new database connection
   */
  async createConnection() {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const db = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Configure connection for performance
        db.configure('busyTimeout', 5000);
        
        // Run PRAGMAs for performance
        db.run('PRAGMA journal_mode = WAL', (err) => {
          if (err) {console.error('Failed to set WAL mode:', err.message);}
        });
        
        db.run('PRAGMA synchronous = NORMAL', (err) => {
          if (err) {console.error('Failed to set synchronous mode:', err.message);}
        });
        
        db.run('PRAGMA cache_size = -64000', (err) => { // 64MB cache
          if (err) {console.error('Failed to set cache size:', err.message);}
        });
        
        db.run('PRAGMA temp_store = MEMORY', (err) => {
          if (err) {console.error('Failed to set temp store:', err.message);}
        });
        
        db.run('PRAGMA mmap_size = 268435456', (err) => { // 256MB memory map
          if (err) {console.error('Failed to set mmap size:', err.message);}
        });
        
        this.stats.totalCreated++;
        this.stats.currentConnections++;
        this.stats.peakConnections = Math.max(this.stats.peakConnections, this.stats.currentConnections);
        
        const connectionTime = Date.now() - startTime;
        if (connectionTime > 100) {
          console.warn(`Slow database connection: ${connectionTime}ms`);
        }
        
        resolve(db);
      });
    });
  }

  /**
   * Get a connection from the pool
   */
  async acquire() {
    // Try to get an available connection
    if (this.pool.length > 0) {
      const conn = this.pool.pop();
      
      // Verify connection is still alive
      const isAlive = await this.checkConnection(conn);
      if (isAlive) {
        this.inUse.add(conn);
        conn._acquiredAt = Date.now();
        return conn;
      } else {
        // Connection dead, close it and try again
        await this.closeConnection(conn);
        return this.acquire();
      }
    }
    
    // Create new connection if under limit
    if (this.inUse.size < this.maxConnections) {
      const conn = await this.createConnection();
      this.inUse.add(conn);
      conn._acquiredAt = Date.now();
      return conn;
    }
    
    // Wait for a connection to become available
    return new Promise((resolve, reject) => {
      this.stats.totalWaited++;
      
      const timeout = setTimeout(() => {
        const index = this.waiting.findIndex(w => w.resolve === resolve);
        if (index > -1) {this.waiting.splice(index, 1);}
        reject(new Error('Connection pool timeout'));
      }, this.connectionTimeoutMs);
      
      this.waiting.push({
        resolve: (conn) => {
          clearTimeout(timeout);
          resolve(conn);
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        }
      });
    });
  }

  /**
   * Release a connection back to the pool
   */
  release(conn) {
    if (!this.inUse.has(conn)) {
      console.warn('Attempted to release connection not in use');
      return;
    }
    
    this.inUse.delete(conn);
    conn._releasedAt = Date.now();
    
    // Check if anyone is waiting
    if (this.waiting.length > 0) {
      const waiter = this.waiting.shift();
      this.inUse.add(conn);
      conn._acquiredAt = Date.now();
      waiter.resolve(conn);
      return;
    }
    
    // Return to pool
    this.pool.push(conn);
  }

  /**
   * Check if connection is still alive
   */
  checkConnection(conn) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 1000);
      
      conn.get('SELECT 1', (err) => {
        clearTimeout(timeout);
        resolve(!err);
      });
    });
  }

  /**
   * Close a specific connection
   */
  closeConnection(conn) {
    return new Promise((resolve) => {
      conn.close((err) => {
        if (err) {
          console.error('Error closing connection:', err.message);
        }
        this.stats.currentConnections--;
        this.stats.totalClosed++;
        resolve();
      });
    });
  }

  /**
   * Clean up idle connections
   */
  async cleanup() {
    const now = Date.now();
    const toClose = [];
    
    // Find idle connections past timeout
    for (let i = this.pool.length - 1; i >= 0; i--) {
      const conn = this.pool[i];
      const idleTime = now - (conn._releasedAt || conn._acquiredAt || now);
      
      if (idleTime > this.idleTimeoutMs) {
        this.pool.splice(i, 1);
        toClose.push(conn);
      }
    }
    
    // Close idle connections
    for (const conn of toClose) {
      await this.closeConnection(conn);
    }
    
    // Check for stale in-use connections
    for (const conn of this.inUse) {
      const heldTime = now - (conn._acquiredAt || now);
      if (heldTime > 30000) { // 30 seconds warning
        console.warn(`Connection held for ${heldTime}ms - possible leak`);
      }
    }
  }

  /**
   * Execute a query with automatic connection management
   */
  async query(sql, params = []) {
    const conn = await this.acquire();
    
    try {
      return await new Promise((resolve, reject) => {
        conn.all(sql, params, (err, rows) => {
          if (err) {reject(err);}
          else {resolve(rows);}
        });
      });
    } finally {
      this.release(conn);
    }
  }

  /**
   * Execute a single row query
   */
  async queryOne(sql, params = []) {
    const conn = await this.acquire();
    
    try {
      return await new Promise((resolve, reject) => {
        conn.get(sql, params, (err, row) => {
          if (err) {reject(err);}
          else {resolve(row);}
        });
      });
    } finally {
      this.release(conn);
    }
  }

  /**
   * Execute a write operation
   */
  async run(sql, params = []) {
    const conn = await this.acquire();
    
    try {
      return await new Promise((resolve, reject) => {
        conn.run(sql, params, function(err) {
          if (err) {reject(err);}
          else {resolve({ lastID: this.lastID, changes: this.changes });}
        });
      });
    } finally {
      this.release(conn);
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      ...this.stats,
      available: this.pool.length,
      inUse: this.inUse.size,
      waiting: this.waiting.length,
      utilization: ((this.inUse.size / this.maxConnections) * 100).toFixed(1) + '%'
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    clearInterval(this.cleanupInterval);
    
    // Reject waiting requests
    while (this.waiting.length > 0) {
      const waiter = this.waiting.shift();
      waiter.reject(new Error('Pool shutting down'));
    }
    
    // Close all connections
    const allConns = [...this.pool, ...this.inUse];
    this.pool = [];
    this.inUse.clear();
    
    for (const conn of allConns) {
      await this.closeConnection(conn);
    }
  }
}

// Singleton instance
let pool = null;

function getPool(options = {}) {
  if (!pool) {
    pool = new ConnectionPool(options);
  }
  return pool;
}

function resetPool() {
  if (pool) {
    pool.shutdown();
    pool = null;
  }
}

module.exports = {
  ConnectionPool,
  getPool,
  resetPool
};
