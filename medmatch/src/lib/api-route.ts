import { NextRequest, NextResponse } from 'next/server'
import { logRequest, logError, generateRequestId } from './logger'

// API route handler type
export type ApiHandler = (
  request: NextRequest,
  context: {
    requestId: string
    startTime: number
    logError: (error: Error, context?: Record<string, any>) => Promise<string | null>
  }
) => Promise<Response> | Response

// Wrapper for API routes that automatically logs requests and errors
export function withLogging(handler: ApiHandler) {
  return async function(request: NextRequest): Promise<Response> {
    const requestId = request.headers.get('x-request-id') || generateRequestId()
    const startTime = Date.now()

    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     request.headers.get('x-real-ip') ||
                     'unknown'

    // Helper to log errors within the route
    const logErrorHelper = async (error: Error, extraContext?: Record<string, any>) => {
      return logError({
        requestId,
        message: error.message,
        stack: error.stack,
        path: request.nextUrl.pathname,
        method: request.method,
        context: extraContext,
        severity: 'ERROR',
      })
    }

    try {
      // Execute the handler
      const response = await handler(request, {
        requestId,
        startTime,
        logError: logErrorHelper,
      })

      // Log the request
      logRequest({
        method: request.method,
        path: request.nextUrl.pathname,
        query: request.nextUrl.search || undefined,
        statusCode: response.status,
        responseTimeMs: Date.now() - startTime,
        userAgent: request.headers.get('user-agent') || undefined,
        referrer: request.headers.get('referer') || undefined,
        ip: clientIp,
        requestId,
      }).catch(() => {})

      // Add request ID to response headers if not already present
      const newResponse = new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      })

      if (!newResponse.headers.has('X-Request-Id')) {
        newResponse.headers.set('X-Request-Id', requestId)
      }

      return newResponse

    } catch (error) {
      const responseTimeMs = Date.now() - startTime

      // Log the error
      const errorId = await logError({
        requestId,
        message: error instanceof Error ? error.message : 'Unknown error in API handler',
        stack: error instanceof Error ? error.stack : undefined,
        path: request.nextUrl.pathname,
        method: request.method,
        severity: 'ERROR',
      })

      // Log the failed request
      logRequest({
        method: request.method,
        path: request.nextUrl.pathname,
        query: request.nextUrl.search || undefined,
        statusCode: 500,
        responseTimeMs,
        userAgent: request.headers.get('user-agent') || undefined,
        referrer: request.headers.get('referer') || undefined,
        ip: clientIp,
        requestId,
        errorId: errorId || undefined,
      }).catch(() => {})

      // Return error response
      return NextResponse.json(
        {
          error: 'Internal server error',
          requestId,
          ...(errorId && { errorId }),
        },
        {
          status: 500,
          headers: { 'X-Request-Id': requestId }
        }
      )
    }
  }
}
