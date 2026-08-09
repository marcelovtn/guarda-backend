export function transformToBrl(value: number, onlyDecimal: boolean = false) {
  return new Intl.NumberFormat('pt-BR', {
    style: onlyDecimal ? 'decimal' : 'currency',
    currency: 'BRL',
  }).format(value || 0)
}
