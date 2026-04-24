/**
 * Circuit Breaker Pattern
 * Prevents cascading failures in distributed systems
 * States: CLOSED (normal), OPEN (failing), HALF_OPEN (testing recovery)
 */

const EventEmitter = require('events');

class CircuitBreaker extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
    this.halfOpenMaxCalls = options.halfOpenMaxCalls || 3;
    this.successThreshold = options.successThreshold || 2;

    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.successes = 0;
    this.halfOpenCalls = 0;
    this.lastFailureTime = null;
    this.nextAttempt = Date.now();
    
    // Metrics
    this.metrics = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      rejectedCalls: 0,
      stateTransitions: []
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute(fn, ...args) {
    this.metrics.totalCalls++;

    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        this.metrics.rejectedCalls++;
        throw new CircuitBreakerError(
          'Circuit breaker is OPEN - too many failures',
          this.getState()
        );
      }
      this.toHalfOpen();
    }

    if (this.state === 'HALF_OPEN' && this.halfOpenCalls >= this.halfOpenMaxCalls) {
      this.metrics.rejectedCalls++;
      throw new CircuitBreakerError(
        'Circuit breaker HALF_OPEN - max calls reached',
        this.getState()
      );
    }

    if (this.state === 'HALF_OPEN') {
      this.halfOpenCalls++;
    }

    try {
      const result = await fn(...args);
      this.onSuccess();
      this.metrics.successfulCalls++;
      return result;
    } catch (error) {
      this.onFailure();
      this.metrics.failedCalls++;
      throw error;
    }
  }

  /**
   * Execute a function synchronously with circuit breaker protection
   */
  executeSync(fn, ...args) {
    this.metrics.totalCalls++;

    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        this.metrics.rejectedCalls++;
        throw new CircuitBreakerError(
          'Circuit breaker is OPEN - too many failures',
          this.getState()
        );
      }
      this.toHalfOpen();
    }

    if (this.state === 'HALF_OPEN' && this.halfOpenCalls >= this.halfOpenMaxCalls) {
      this.metrics.rejectedCalls++;
      throw new CircuitBreakerError(
        'Circuit breaker HALF_OPEN - max calls reached',
        this.getState()
      );
    }

    if (this.state === 'HALF_OPEN') {
      this.halfOpenCalls++;
    }

    try {
      const result = fn(...args);
      this.onSuccess();
      this.metrics.successfulCalls++;
      return result;
    } catch (error) {
      this.onFailure();
      this.metrics.failedCalls++;
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;

    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.successThreshold) {
        this.toClosed();
      }
    }
  }

  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.toOpen();
    }
  }

  toOpen() {
    this.recordTransition('OPEN');
    this.state = 'OPEN';
    this.nextAttempt = Date.now() + this.resetTimeout;
    this.emit('open', this.getState());
  }

  toHalfOpen() {
    this.recordTransition('HALF_OPEN');
    this.state = 'HALF_OPEN';
    this.halfOpenCalls = 0;
    this.successes = 0;
    this.emit('halfOpen', this.getState());
  }

  toClosed() {
    this.recordTransition('CLOSED');
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.halfOpenCalls = 0;
    this.emit('closed', this.getState());
  }

  recordTransition(toState) {
    this.metrics.stateTransitions.push({
      from: this.state,
      to: toState,
      time: Date.now()
    });
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      halfOpenCalls: this.halfOpenCalls,
      nextAttempt: this.nextAttempt,
      lastFailureTime: this.lastFailureTime
    };
  }

  getMetrics() {
    return {
      ...this.metrics,
      currentState: this.state
    };
  }

  reset() {
    this.toClosed();
    this.metrics = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      rejectedCalls: 0,
      stateTransitions: []
    };
  }
}

class CircuitBreakerError extends Error {
  constructor(message, state) {
    super(message);
    this.name = 'CircuitBreakerError';
    this.state = state;
    this.isCircuitBreaker = true;
  }
}

/**
 * Circuit Breaker Registry
 * Manages multiple circuit breakers for different services
 */
class CircuitBreakerRegistry {
  constructor() {
    this.breakers = new Map();
    this.defaultOptions = {
      failureThreshold: 5,
      resetTimeout: 30000,
      halfOpenMaxCalls: 3,
      successThreshold: 2
    };
  }

  /**
   * Get or create a circuit breaker
   */
  get(name, options = {}) {
    if (!this.breakers.has(name)) {
      const mergedOptions = { ...this.defaultOptions, ...options };
      const breaker = new CircuitBreaker(mergedOptions);
      this.breakers.set(name, breaker);
    }
    return this.breakers.get(name);
  }

  /**
   * Remove a circuit breaker
   */
  remove(name) {
    this.breakers.delete(name);
  }

  /**
   * Get all circuit breakers
   */
  getAll() {
    return Array.from(this.breakers.entries()).map(([name, breaker]) => ({
      name,
      state: breaker.getState(),
      metrics: breaker.getMetrics()
    }));
  }

  /**
   * Reset all circuit breakers
   */
  resetAll() {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Create middleware for external HTTP calls
   */
  middleware(serviceName, options = {}) {
    const breaker = this.get(serviceName, options);

    return async (req, res, next) => {
      req.circuitBreaker = breaker;
      next();
    };
  }
}

// Pre-configured breakers for common services
const registry = new CircuitBreakerRegistry();

// Presets for different service types
const presets = {
  // External API calls
  external: (name) => registry.get(name, {
    failureThreshold: 3,
    resetTimeout: 60000
  }),

  // Database operations
  database: (name) => registry.get(name, {
    failureThreshold: 10,
    resetTimeout: 15000
  }),

  // File system operations
  filesystem: (name) => registry.get(name, {
    failureThreshold: 5,
    resetTimeout: 30000
  }),

  // Email/notification services
  notification: (name) => registry.get(name, {
    failureThreshold: 3,
    resetTimeout: 120000
  })
};

module.exports = {
  CircuitBreaker,
  CircuitBreakerRegistry,
  CircuitBreakerError,
  registry,
  presets
};
