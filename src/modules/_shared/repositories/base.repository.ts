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

  /**
   * Instructors the current user is allowed to watch.
   *
   * Every student-facing read of a Track or Lesson must be scoped by this.
   * It lives here, rather than in each service, so that adding a new read path
   * cannot accidentally expose one instructor's content to another's students.
   *
   * An instructor always has access to their own catalogue, subscription or
   * not — otherwise they could not preview what they publish.
   */
  protected async getAccessibleInstructorIds(): Promise<string[]> {
    const userId = this.getUserId()

    const [subscriptions, ownInstructor] = await Promise.all([
      prisma.subscription.findMany({
        where: { studentId: userId, status: 'ACTIVE', deletedAt: null },
        select: { instructorId: true },
      }),
      prisma.instructor.findUnique({
        where: { userId },
        select: { id: true },
      }),
    ])

    const ids = new Set(subscriptions.map((s) => s.instructorId))
    if (ownInstructor) ids.add(ownInstructor.id)

    return [...ids]
  }

  /**
   * The Instructor row for the current user, for instructor-only operations.
   * Throws 403 when the user is a student — the row existing is what makes
   * someone an instructor.
   */
  protected async getCurrentInstructor(): Promise<{ id: string }> {
    const userId = this.getUserId()

    const instructor = await prisma.instructor.findFirst({
      where: { userId, deletedAt: null },
      select: { id: true },
    })

    if (!instructor) {
      throw new HTTPException(403, { message: 'Not an instructor' })
    }

    return instructor
  }
}
