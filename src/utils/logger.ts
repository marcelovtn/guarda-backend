import pino from 'pino'

const redactFields = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers.set-cookie',
  'password',
  'token',
  'apikey',
  'apiKey',
  'authorization',
]

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'production'
      ? undefined
      : {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard' },
        },
  redact: { paths: redactFields, remove: true },
  messageKey: 'message',
  base: undefined,
})

