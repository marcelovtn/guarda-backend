export function sanitizeBody(body: any): any {
  if (body == null || typeof body !== 'object') return body

  const sensitiveKeys = [
    'password',
    'code',
    'token',
    'token_hash',
    'access_token',
    'refresh_token',
    'session',
  ]

  const sanitize = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(sanitize)
    } else if (obj && typeof obj === 'object') {
      const cleanObj: Record<string, any> = {}
      for (const key of Object.keys(obj)) {
        if (sensitiveKeys.includes(key)) {
          cleanObj[key] = '[UNAUTHORIZED]'
        } else {
          cleanObj[key] = sanitize(obj[key])
        }
      }
      return cleanObj
    }
    return obj
  }

  return sanitize(body)
}
