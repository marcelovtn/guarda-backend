import { AUTH_ERROR_MESSAGES } from './errorsTranslations/auth.js'

const allTranslations = {
  ...AUTH_ERROR_MESSAGES,
}

export function getTranslatedErrorMessage(key: string): string {
  return allTranslations[key as keyof typeof allTranslations] || key
}
