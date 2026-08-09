export function formatMonth(date: Date) {
  return date.toLocaleDateString('pt-BR', { month: 'long' }).replace(/^\w/, (c) => c.toUpperCase())
}
