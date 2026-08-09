export const SPECIAL_CHARACTERS = '@$!%*?&\\]#=:|'
export const SPECIAL_CHARACTERS_REGEX = new RegExp(`[${SPECIAL_CHARACTERS}]`)
export const LOWERCASE_REGEX = /[a-z]/
export const UPPERCASE_REGEX = /[A-Z]/
export const DIGIT_REGEX = /\d/
export const MIN_LENGTH = 8

export function getPasswordRequirements(password: string) {
  return [
    {
      text: 'Pelo menos uma letra minúscula',
      test: LOWERCASE_REGEX.test(password),
    },
    {
      text: 'Pelo menos uma letra maiúscula',
      test: UPPERCASE_REGEX.test(password),
    },
    {
      text: 'Pelo menos um número',
      test: DIGIT_REGEX.test(password),
    },
    {
      text: 'Pelo menos um caractere especial',
      test: SPECIAL_CHARACTERS_REGEX.test(password),
    },
    {
      text: 'Pelo menos 8 caracteres',
      test: password.length >= MIN_LENGTH,
    },
  ]
}

export function areAllRequirementsMet(requirements: { text: string; test: boolean }[]) {
  return requirements.every((req) => req.test)
}

export function getStrengthPassword(password: string) {
  const tests = [
    LOWERCASE_REGEX.test(password),
    UPPERCASE_REGEX.test(password),
    DIGIT_REGEX.test(password),
    SPECIAL_CHARACTERS_REGEX.test(password),
    password.length >= MIN_LENGTH,
  ]

  const metRequirements = tests.filter(Boolean).length
  const strengthPercentage = (metRequirements / tests.length) * 100

  if (strengthPercentage === 100) {
    return { strength: 100, text: 'Forte' }
  } else if (strengthPercentage >= 60) {
    return { strength: 60, text: 'Média' }
  } else {
    return { strength: 30, text: 'Fraca' }
  }
}
