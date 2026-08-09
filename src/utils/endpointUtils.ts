// Custom Error Class for HTTP Errors
class HttpError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

// Utility Function: Validate Content-Type Header
function isValidContentType(request: Request): boolean {
  const contentType = request.headers.get('Content-Type') || request.headers.get('content-type')
  return contentType !== null && contentType.includes('application/json')
}

// Utility Function: Parse JSON Body from Request
export async function getJsonBody<T>(request: Request): Promise<T> {
  if (!isValidContentType(request)) {
    throw new HttpError('Unsupported Media Type. Expected application/json.', 415)
  }
  const rawText = await request.text()
  if (!rawText) {
    throw new HttpError('Empty request body. Expected JSON.', 400)
  }
  try {
    return JSON.parse(rawText)
  } catch {
    throw new HttpError('Invalid JSON format.', 400)
  }
}

// Utility Function: Create JSON Response for Errors
export function createErrorResponse(message: string, status: number, details?: string): Response {
  return new Response(JSON.stringify({ error: message, details }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Utility Function: Create JSON Response for Success
export function createSuccessResponse(data: any, status: number): Response {
  return new Response(JSON.stringify({ data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Utility Function: Handle Exceptions and Return Appropriate Responses
export function handleException(error: any): Response {
  console.error('Error:', error)
  if (error instanceof HttpError) {
    return createErrorResponse(error.message, error.status)
  }
  let errorMessage = 'Internal Server Error'
  if (typeof error === 'object' && error !== null && 'constraint' in error && 'detail' in error) {
    const typedError = error as {
      constraint: string
      detail: string
      message: string
    }
    console.error('Foreign Key Constraint Error:', {
      constraint: typedError.constraint,
      detail: typedError.detail,
    })
    errorMessage += ' - Constraint Violation'
  }
  return createErrorResponse(errorMessage, 500, error instanceof Error ? error.message : undefined)
}
