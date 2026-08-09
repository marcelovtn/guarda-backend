import { AsyncLocalStorage } from 'async_hooks'

export type AuthContextStore = {
  accessToken?: string
  userId?: string
  requestId?: string
}

export const authContext = new AsyncLocalStorage<AuthContextStore>()

export function getAuthContext(): AuthContextStore {
  return authContext.getStore() ?? {}
}
