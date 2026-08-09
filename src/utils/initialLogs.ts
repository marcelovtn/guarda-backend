
export const getStarterLog = (info: any) => {
  const env = process.env.NODE_ENV || 'development'
  const url = `http://${info.address}:${info.port}`

  const banner = [
    '',
    '🟢 AM Backend is up! 🚀',
    '──────────────────────────────────────────────',
    `🔗 URL:    ${url}`,
    `🔊 Port:   ${info.port}`,
    `🌱 Env:    ${env}`,
    `🕒 Time:   ${new Date().toLocaleString()}`,
    '──────────────────────────────────────────────',
    '',
  ].join('\n')

  console.log(banner)
}
