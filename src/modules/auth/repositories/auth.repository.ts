import { HTTPException } from "hono/http-exception";
import { BaseRepository } from "../../_shared/repositories/base.repository.js";

export class AuthRepository extends BaseRepository {
  /**
   * NOTA: signInWithPassword, signUp, signOut, verifyOtp, updatePassword, exchangeCodeForSession, signInWithGoogle
   * são agora gerenciados pelo Better Auth. Use o auth object do Better Auth para essas operações.
   *
   * Exemplo:
   * import { auth } from '../../../lib/auth.js'
   * await auth.api.signInEmail({ body: { email, password } })
   */

  async getUserEncryptionKey(userId: string) {
    const prisma = this.getClient();

    try {
      const data = await prisma.encryptionKey.findUnique({
        where: { userId },
        select: { key: true },
      });

      if (!data) {
        throw new HTTPException(404, { message: "Encryption key not found" });
      }

      return data;
    } catch (error: any) {
      if (error instanceof HTTPException) throw error;
      throw new HTTPException(400, { message: error.message });
    }
  }

  async checkEmailExists(email: string): Promise<boolean> {
    const prisma = this.getClient();

    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true },
      });

      return !!user;
    } catch (error: any) {
      throw new HTTPException(400, { message: error.message });
    }
  }
}
