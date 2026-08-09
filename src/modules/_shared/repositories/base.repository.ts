import { prisma } from '../../../lib/prisma.js'
import { getAuthContext } from '../../../utils/authContext.js'
import { HTTPException } from 'hono/http-exception'

export class BaseRepository {
  /**
   * Retorna o Prisma Client e o ID do usuário autenticado
   */
  protected async getClientAndUser(): Promise<{ prisma: typeof prisma; user: { id: string } }> {
    const { userId } = getAuthContext()
    
    if (!userId) {
      throw new HTTPException(401, { message: 'Missing or invalid session' })
    }
    
    return { 
      prisma,
      user: { id: userId }
    }
  }

  /**
   * Retorna apenas o Prisma Client
   */
  protected getClient(): typeof prisma {
    return prisma
  }

  /**
   * Retorna o ID do usuário autenticado
   */
  protected getUserId(): string {
    const { userId } = getAuthContext()
    
    if (!userId) {
      throw new HTTPException(401, { message: 'Missing or invalid session' })
    }
    
    return userId
  }
}
