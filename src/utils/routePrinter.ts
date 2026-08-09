import { inspectRoutes } from 'hono/dev'

const colors: Record<string, string> = {
  GET: '\x1b[32m', // green
  POST: '\x1b[36m', // cyan
  PUT: '\x1b[33m', // yellow
  DELETE: '\x1b[31m', // red
  PATCH: '\x1b[35m', // magenta
  ALL: '\x1b[37m', // white
  DEFAULT: '\x1b[37m', // white
}

export function printRoutes(app: any) {
  const routes = inspectRoutes(app)
  console.log('\nRegistered routes:\n')

  routes.forEach((r) => {
    const color = colors[r.method] ?? colors.DEFAULT
    const reset = '\x1b[0m'
    console.log(`${color}${r.method.padEnd(7)} ${r.path}${reset}`)
  })
}
