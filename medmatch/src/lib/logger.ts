import { ErrorSeverity } from '@prisma/client';

// Lazy-load Prisma to avoid build-time issues
let prisma: any = null;

function getPrisma() {
  if (!prisma && process.env.DATABASE_URL) {
    const { PrismaClient } = require('@prisma/client');
    prisma = new PrismaClient();
  }
  return prisma;
}

// Generate unique request ID
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// Structured log entry type
export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  message: string;
  requestId?: string;
  path?: string;
  method?: string;
  userId?: string;
  context?: Record<string, any>;
  error?: Error;
}

// Console logger with JSON formatting
export function logToConsole(entry: LogEntry): void {
  const logData = {
    timestamp: entry.timestamp,
    level: entry.level,
    message: entry.message,
    ...(entry.requestId && { requestId: entry.requestId }),
    ...(entry.path && { path: entry.path }),
    ...(entry.method && { method: entry.method }),
    ...(entry.userId && { userId: entry.userId }),
    ...(entry.context && { context: entry.context }),
    ...(entry.error && {
      error: {
        message: entry.error.message,
        stack: entry.error.stack,
        name: entry.error.name,
      },
    }),
  };

  // Output JSON to stdout for machine parsing
  console.log(JSON.stringify(logData));
}

// Log request to database
export async function logRequest(data: {
  method: string;
  path: string;
  query?: string;
  statusCode: number;
  responseTimeMs: number;
  userAgent?: string;
  referrer?: string;
  ip?: string;
  requestId: string;
  userId?: string;
  errorId?: string;
}): Promise<void> {
  const db = getPrisma();
  if (!db) {
    logToConsole({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: 'Database not available, request not logged to DB',
      requestId: data.requestId,
    });
    return;
  }

  try {
    await db.requestLog.create({
      data: {
        ...data,
        timestamp: new Date(),
      },
    });

    // Update metrics
    await updateMetrics(data);
  } catch (error) {
    logToConsole({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Failed to log request to database',
      requestId: data.requestId,
      error: error instanceof Error ? error : undefined,
    });
  }
}

// Log error to database
export async function logError(data: {
  requestId?: string;
  message: string;
  stack?: string;
  code?: string;
  path?: string;
  method?: string;
  userId?: string;
  context?: Record<string, any>;
  severity?: ErrorSeverity;
}): Promise<string | null> {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: severityToLevel(data.severity || 'ERROR'),
    message: data.message,
    requestId: data.requestId,
    path: data.path,
    method: data.method,
    userId: data.userId,
    context: data.context,
  };

  // Always log to console
  logToConsole(entry);

  const db = getPrisma();
  if (!db) {
    return null;
  }

  try {
    const errorRecord = await db.errorLog.create({
      data: {
        ...data,
        context: data.context ? JSON.stringify(data.context) : null,
        severity: data.severity || 'ERROR',
        createdAt: new Date(),
      },
    });

    return errorRecord.id;
  } catch (dbError) {
    logToConsole({
      timestamp: new Date().toISOString(),
      level: 'critical',
      message: 'Failed to log error to database',
      requestId: data.requestId,
      error: dbError instanceof Error ? dbError : undefined,
    });
    return null;
  }
}

// Update API metrics
async function updateMetrics(requestData: {
  path: string;
  statusCode: number;
  responseTimeMs: number;
}): Promise<void> {
  const db = getPrisma();
  if (!db) return;

  try {
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const hour = now.getHours();

    // Get or create metrics record for this hour
    let metrics = await db.apiMetrics.findUnique({
      where: {
        date_hour: {
          date,
          hour,
        },
      },
    });

    if (!metrics) {
      metrics = await db.apiMetrics.create({
        data: {
          date,
          hour,
          totalRequests: 0,
          successfulRequests: 0,
          errorRequests: 0,
          totalResponseTimeMs: 0,
          avgResponseTimeMs: 0,
          maxResponseTimeMs: 0,
          errorTypes: '{}',
          endpointStats: '{}',
        },
      });
    }

    // Update metrics
    const isError = requestData.statusCode >= 400;
    const errorTypes = JSON.parse(metrics.errorTypes || '{}');
    const endpointStats = JSON.parse(metrics.endpointStats || '{}');

    if (isError) {
      const statusKey = requestData.statusCode.toString();
      errorTypes[statusKey] = (errorTypes[statusKey] || 0) + 1;
    }

    endpointStats[requestData.path] = (endpointStats[requestData.path] || 0) + 1;

    const newTotalRequests = metrics.totalRequests + 1;
    const newTotalResponseTime = metrics.totalResponseTimeMs + requestData.responseTimeMs;

    await db.apiMetrics.update({
      where: { id: metrics.id },
      data: {
        totalRequests: newTotalRequests,
        successfulRequests: metrics.successfulRequests + (isError ? 0 : 1),
        errorRequests: metrics.errorRequests + (isError ? 1 : 0),
        totalResponseTimeMs: newTotalResponseTime,
        avgResponseTimeMs: Math.round(newTotalResponseTime / newTotalRequests),
        maxResponseTimeMs: Math.max(metrics.maxResponseTimeMs, requestData.responseTimeMs),
        errorTypes: JSON.stringify(errorTypes),
        endpointStats: JSON.stringify(endpointStats),
      },
    });
  } catch (error) {
    logToConsole({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Failed to update metrics',
      error: error instanceof Error ? error : undefined,
    });
  }
}

// Log health check
export async function logHealthCheck(data: {
  type: 'basic' | 'deep';
  status: 'healthy' | 'unhealthy';
  responseTimeMs: number;
  details?: Record<string, any>;
  error?: string;
}): Promise<void> {
  const db = getPrisma();
  if (!db) return;

  try {
    await db.healthCheckLog.create({
      data: {
        ...data,
        details: data.details ? JSON.stringify(data.details) : null,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    logToConsole({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Failed to log health check',
      error: error instanceof Error ? error : undefined,
    });
  }
}

// Helper to convert severity to log level
function severityToLevel(severity: ErrorSeverity): LogEntry['level'] {
  switch (severity) {
    case 'DEBUG':
      return 'debug';
    case 'INFO':
      return 'info';
    case 'WARNING':
      return 'warn';
    case 'ERROR':
      return 'error';
    case 'CRITICAL':
      return 'critical';
    default:
      return 'error';
  }
}

// Convenience methods
export const logger = {
  debug: (message: string, context?: Record<string, any>) => {
    logToConsole({
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      context,
    });
  },

  info: (message: string, context?: Record<string, any>) => {
    logToConsole({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context,
    });
  },

  warn: (message: string, context?: Record<string, any>) => {
    logToConsole({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      context,
    });
  },

  error: (message: string, error?: Error, context?: Record<string, any>) => {
    logToConsole({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      context,
      error,
    });
  },

  critical: (message: string, error?: Error, context?: Record<string, any>) => {
    logToConsole({
      timestamp: new Date().toISOString(),
      level: 'critical',
      message,
      context,
      error,
    });
  },
};

// Get metrics for admin dashboard
export async function getMetrics(days: number = 7): Promise<{
  totalRequests: number;
  errorRate: number;
  avgResponseTimeMs: number;
  topErrorTypes: Array<{ code: string; count: number }>;
  requestsByDay: Array<{ date: string; count: number; errors: number }>;
}> {
  const db = getPrisma();
  if (!db) {
    throw new Error('Database not available');
  }

  const since = new Date();
  since.setDate(since.getDate() - days);

  const metrics = await db.apiMetrics.findMany({
    where: {
      date: {
        gte: since,
      },
    },
    orderBy: {
      date: 'asc',
    },
  });

  let totalRequests = 0;
  let totalErrors = 0;
  let totalResponseTime = 0;
  let responseTimeCount = 0;
  const errorTypeMap = new Map<string, number>();
  const dayMap = new Map<string, { count: number; errors: number }>();

  for (const m of metrics) {
    totalRequests += m.totalRequests;
    totalErrors += m.errorRequests;
    
    if (m.avgResponseTimeMs > 0) {
      totalResponseTime += m.avgResponseTimeMs * m.totalRequests;
      responseTimeCount += m.totalRequests;
    }

    const errorTypes = JSON.parse(m.errorTypes || '{}');
    for (const [code, count] of Object.entries(errorTypes)) {
      errorTypeMap.set(code, (errorTypeMap.get(code) || 0) + (count as number));
    }

    const dateKey = m.date.toISOString().split('T')[0];
    const existing = dayMap.get(dateKey) || { count: 0, errors: 0 };
    dayMap.set(dateKey, {
      count: existing.count + m.totalRequests,
      errors: existing.errors + m.errorRequests,
    });
  }

  const topErrorTypes = Array.from(errorTypeMap.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const requestsByDay = Array.from(dayMap.entries())
    .map(([date, data]) => ({
      date,
      count: data.count,
      errors: data.errors,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalRequests,
    errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
    avgResponseTimeMs: responseTimeCount > 0 ? Math.round(totalResponseTime / responseTimeCount) : 0,
    topErrorTypes,
    requestsByDay,
  };
}
