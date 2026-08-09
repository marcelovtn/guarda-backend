import { getUserIdByEmail as getUserIdByEmailHelper } from '../../lib/database-helpers.js'

export async function getUserIdByEmail(email: string): Promise<Array<string>> {
  try {
    const data = await getUserIdByEmailHelper(email)
    return data.map((item) => item.id)
  } catch {
    return []
  }
}
