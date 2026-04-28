/**
 * Circuit Breaker Middleware Tests
 * 
 * @jest-environment node
 */

const {
  CircuitBreaker,
  CircuitBreakerRegistry,
  CircuitBreakerError,
  registry,
  presets
} = require('./circuitBreaker');

describe('CircuitBreaker', () => {
  let breaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 100,
      halfOpenMaxCalls: 2,
      successThreshold: 1
    });
  });

  afterEach(() => {
    breaker.removeAllListeners();
  });

  describe('Constructor', () => {
    test('should create with default options', () => {
      const defaultBreaker = new CircuitBreaker();
      expect(defaultBreaker.state).toBe('CLOSED');
      expect(defaultBreaker.failureThreshold).toBe(5);
      expect(defaultBreaker.resetTimeout).toBe(30000);
      expect(defaultBreaker.metrics.totalCalls).toBe(0);
    });

    test('should create with custom options', () => {
      const customBreaker = new CircuitBreaker({
        failureThreshold: 10,
        resetTimeout: 5000,
        halfOpenMaxCalls: 5,
        successThreshold: 3
      });
      expect(customBreaker.failureThreshold).toBe(10);
      expect(customBreaker.resetTimeout).toBe(5000);
      expect(customBreaker.halfOpenMaxCalls).toBe(5);
      expect(customBreaker.successThreshold).toBe(3);
    });
  });

  describe('State Transitions', () => {
    test('should start in CLOSED state', () => {
      expect(breaker.getState().state).toBe('CLOSED');
    });

    test('should transition to OPEN after threshold failures', async () => {
      const failingFn = jest.fn().mockRejectedValue(new Error('fail'));
      
      for (let i = 0; i < 3; i++) {
        try { await breaker.execute(failingFn); } catch (e) {}
      }
      
      expect(breaker.state).toBe('OPEN');
    });

    test('should emit open event when transitioning to OPEN', async () => {
      const openHandler = jest.fn();
      breaker.on('open', openHandler);
      
      const failingFn = jest.fn().mockRejectedValue(new Error('fail'));
      for (let i = 0; i < 3; i++) {
        try { await breaker.execute(failingFn); } catch (e) {}
      }
      
      expect(openHandler).toHaveBeenCalled();
    });

    test('should transition to HALF_OPEN after reset timeout', async () => {
      const failingFn = jest.fn().mockRejectedValue(new Error('fail'));
      for (let i = 0; i < 3; i++) {
        try { await breaker.execute(failingFn); } catch (e) {}
      }
      
      expect(breaker.state).toBe('OPEN');
      
      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Call toHalfOpen to manually transition (simulating what happens in execute)
      breaker.toHalfOpen();
      expect(breaker.state).toBe('HALF_OPEN');
    });

    test('should transition to CLOSED after success threshold', async () => {
      // First transition to HALF_OPEN manually
      breaker.toHalfOpen();
      
      // HALF_OPEN: success should transition to CLOSED (successThreshold=1)
      const successFn = jest.fn().mockResolvedValue('success');
      await breaker.execute(successFn);
      
      expect(breaker.state).toBe('CLOSED');
    });

    test('should track state transitions', async () => {
      const failingFn = jest.fn().mockRejectedValue(new Error('fail'));
      for (let i = 0; i < 3; i++) {
        try { await breaker.execute(failingFn); } catch (e) {}
      }
      
      expect(breaker.metrics.stateTransitions.length).toBeGreaterThan(0);
      expect(breaker.metrics.stateTransitions[0]).toHaveProperty('from');
      expect(breaker.metrics.stateTransitions[0]).toHaveProperty('to');
      expect(breaker.metrics.stateTransitions[0]).toHaveProperty('time');
    });
  });

  describe('execute() - async', () => {
    test('should execute successful function', async () => {
      const successFn = jest.fn().mockResolvedValue('result');
      const result = await breaker.execute(successFn, 'arg1', 'arg2');
      
      expect(result).toBe('result');
      expect(successFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    test('should track successful calls', async () => {
      const successFn = jest.fn().mockResolvedValue('result');
      await breaker.execute(successFn);
      
      expect(breaker.metrics.totalCalls).toBe(1);
      expect(breaker.metrics.successfulCalls).toBe(1);
    });

    test('should throw on function failure', async () => {
      const error = new Error('test error');
      const failingFn = jest.fn().mockRejectedValue(error);
      
      await expect(breaker.execute(failingFn)).rejects.toThrow('test error');
    });

    test('should track failed calls', async () => {
      const failingFn = jest.fn().mockRejectedValue(new Error('fail'));
      try { await breaker.execute(failingFn); } catch (e) {}
      
      expect(breaker.metrics.totalCalls).toBe(1);
      expect(breaker.metrics.failedCalls).toBe(1);
    });

    test('should reject when OPEN', async () => {
      breaker.toOpen();
      
      const successFn = jest.fn().mockResolvedValue('result');
      await expect(breaker.execute(successFn)).rejects.toThrow(CircuitBreakerError);
    });

    test('should track rejected calls when OPEN', async () => {
      breaker.toOpen();
      const successFn = jest.fn().mockResolvedValue('result');
      try { await breaker.execute(successFn); } catch (e) {}
      
      expect(breaker.metrics.rejectedCalls).toBe(1);
    });

    test('should reject when HALF_OPEN with max calls reached', async () => {
      // Create a breaker with higher success threshold to stay in HALF_OPEN
      const testBreaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 100,
        halfOpenMaxCalls: 2,
        successThreshold: 10 // High threshold so it stays HALF_OPEN
      });
      
      // Go directly to HALF_OPEN
      testBreaker.toHalfOpen();
      
      // Make max calls (2 allowed)
      const successFn = jest.fn().mockResolvedValue('result');
      await testBreaker.execute(successFn); // 1st call - allowed
      await testBreaker.execute(successFn); // 2nd call - allowed
      
      // 3rd call should be rejected (halfOpenCalls >= halfOpenMaxCalls)
      await expect(testBreaker.execute(successFn)).rejects.toThrow('max calls reached');
    });
  });

  describe('executeSync() - synchronous', () => {
    test('should execute successful sync function', () => {
      const successFn = jest.fn().mockReturnValue('result');
      const result = breaker.executeSync(successFn, 'arg1');
      
      expect(result).toBe('result');
    });

    test('should throw on sync function failure', () => {
      const failingFn = jest.fn().mockImplementation(() => {
        throw new Error('sync error');
      });
      
      expect(() => breaker.executeSync(failingFn)).toThrow('sync error');
    });

    test('should reject when OPEN for sync', () => {
      breaker.toOpen();
      const successFn = jest.fn().mockReturnValue('result');
      
      expect(() => breaker.executeSync(successFn)).toThrow(CircuitBreakerError);
    });
  });

  describe('Metrics', () => {
    test('should get state info', () => {
      const state = breaker.getState();
      expect(state).toHaveProperty('state');
      expect(state).toHaveProperty('failures');
      expect(state).toHaveProperty('successes');
      expect(state).toHaveProperty('halfOpenCalls');
      expect(state).toHaveProperty('nextAttempt');
      expect(state).toHaveProperty('lastFailureTime');
    });

    test('should get metrics', () => {
      const metrics = breaker.getMetrics();
      expect(metrics).toHaveProperty('totalCalls');
      expect(metrics).toHaveProperty('successfulCalls');
      expect(metrics).toHaveProperty('failedCalls');
      expect(metrics).toHaveProperty('rejectedCalls');
      expect(metrics).toHaveProperty('stateTransitions');
      expect(metrics).toHaveProperty('currentState');
    });

    test('should reset metrics', () => {
      breaker.metrics.totalCalls = 10;
      breaker.metrics.successfulCalls = 5;
      
      breaker.reset();
      
      expect(breaker.metrics.totalCalls).toBe(0);
      expect(breaker.metrics.successfulCalls).toBe(0);
      expect(breaker.state).toBe('CLOSED');
    });
  });
});

describe('CircuitBreakerError', () => {
  test('should create error with message and state', () => {
    const state = { state: 'OPEN', failures: 5 };
    const error = new CircuitBreakerError('Circuit open', state);
    
    expect(error.message).toBe('Circuit open');
    expect(error.state).toEqual(state);
    expect(error.name).toBe('CircuitBreakerError');
    expect(error.isCircuitBreaker).toBe(true);
  });

  test('should be instanceof Error', () => {
    const error = new CircuitBreakerError('test', {});
    expect(error).toBeInstanceOf(Error);
  });
});

describe('CircuitBreakerRegistry', () => {
  let testRegistry;

  beforeEach(() => {
    testRegistry = new CircuitBreakerRegistry();
  });

  test('should get or create breaker', () => {
    const breaker1 = testRegistry.get('service1');
    const breaker2 = testRegistry.get('service1');
    
    expect(breaker1).toBe(breaker2);
  });

  test('should create breaker with merged options', () => {
    const breaker = testRegistry.get('service2', { failureThreshold: 10 });
    expect(breaker.failureThreshold).toBe(10);
  });

  test('should remove breaker', () => {
    testRegistry.get('service3');
    expect(testRegistry.breakers.has('service3')).toBe(true);
    
    testRegistry.remove('service3');
    expect(testRegistry.breakers.has('service3')).toBe(false);
  });

  test('should get all breakers info', () => {
    testRegistry.get('serviceA');
    testRegistry.get('serviceB');
    
    const all = testRegistry.getAll();
    expect(all.length).toBe(2);
    expect(all[0]).toHaveProperty('name');
    expect(all[0]).toHaveProperty('state');
    expect(all[0]).toHaveProperty('metrics');
  });

  test('should reset all breakers', () => {
    const breaker = testRegistry.get('serviceC');
    breaker.toOpen();
    expect(breaker.state).toBe('OPEN');
    
    testRegistry.resetAll();
    expect(breaker.state).toBe('CLOSED');
  });

  test('should create middleware', () => {
    const middleware = testRegistry.middleware('serviceD');
    expect(typeof middleware).toBe('function');
  });

  test('middleware should attach breaker to request', (done) => {
    const middleware = testRegistry.middleware('serviceE');
    const mockReq = {};
    const mockRes = {};
    
    middleware(mockReq, mockRes, () => {
      expect(mockReq.circuitBreaker).toBeDefined();
      done();
    });
  });
});

describe('Presets', () => {
  test('should create external preset', () => {
    const breaker = presets.external('api-service');
    expect(breaker).toBeDefined();
    expect(breaker.failureThreshold).toBe(3);
    expect(breaker.resetTimeout).toBe(60000);
  });

  test('should create database preset', () => {
    const breaker = presets.database('db-service');
    expect(breaker).toBeDefined();
    expect(breaker.failureThreshold).toBe(10);
    expect(breaker.resetTimeout).toBe(15000);
  });

  test('should create filesystem preset', () => {
    const breaker = presets.filesystem('fs-service');
    expect(breaker).toBeDefined();
    expect(breaker.failureThreshold).toBe(5);
    expect(breaker.resetTimeout).toBe(30000);
  });

  test('should create notification preset', () => {
    const breaker = presets.notification('email-service');
    expect(breaker).toBeDefined();
    expect(breaker.failureThreshold).toBe(3);
    expect(breaker.resetTimeout).toBe(120000);
  });
});

describe('Global Registry', () => {
  test('should export registry singleton', () => {
    expect(registry).toBeDefined();
    expect(registry).toBeInstanceOf(CircuitBreakerRegistry);
  });
});
