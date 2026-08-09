import { BaseRepository } from '../../_shared/repositories/base.repository.js'

export class UserDataRepository extends BaseRepository {
  async deleteUserAccount(userId: string) {
    const prisma = this.getClient()
    try {
      const user = await prisma.user.delete({ where: { id: userId } })
      return { data: { id: user.id }, error: null }
    } catch (error: any) {
      return { data: null, error }
    }
  }
}
