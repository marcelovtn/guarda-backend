import dayjs from 'dayjs'

export const log = (type: 'info' | 'warn' | 'error' | 'chat', message: string, extra?: any) => {
  const time = dayjs().format('HH:mm:ss')

  const icons = {
    info: '📨',
    warn: '⚠️',
    error: '❌',
    chat: '💬',
  }

  const color = {
    info: '\x1b[36m',
    warn: '\x1b[33m',
    error: '\x1b[31m',
    chat: '\x1b[35m',
  }

  console.log(`${color[type]}[${time}] ${icons[type]} ${message}\x1b[0m`)
  if (extra) console.dir(extra, { depth: null, colors: true })
}

export const logChatMessage = ({
  chat_id,
  content,
  type,
}: {
  chat_id: string
  content: string
  type: string
}) => {
  const time = dayjs().format('HH:mm:ss')
  const isFromUserOrAi = type === 'user' || type === 'ai'

  const reset = '\x1b[0m'
  const grayLine = '\x1b[90m────────────────────────────────────────────\x1b[0m'

  const numberColor = '\x1b[1m\x1b[34m' // Azul escuro
  const sendColor = '\x1b[32m' // Verde
  const aiColor = '\x1b[35m' // Roxo

  const isAI = type === 'ai'
  const arrow = isFromUserOrAi ? '👉' : '👈'
  const action = isFromUserOrAi ? ' Enviou' : ' Recebeu'
  const actionColor = isFromUserOrAi ? sendColor : aiColor
  const aiPrefix = isAI ? '🤖' : '👤'

  const styledTo = `${numberColor}${chat_id}${reset}`

  console.log(`\n${grayLine}`)
  console.log(
    `${actionColor}[${time}] 💬  ${styledTo} ${arrow} ${actionColor}${action} ${aiPrefix}: ${reset}${content}`,
  )
  console.log(`${grayLine}\n`)
}
