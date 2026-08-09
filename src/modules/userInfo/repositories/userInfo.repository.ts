import type { Belt } from "@prisma/client";
import { HTTPException } from "hono/http-exception";
import { BaseRepository } from "../../_shared/repositories/base.repository.js";

export class UserInfoRepository extends BaseRepository {
  async findByUserId(userId: string) {
    const prisma = this.getClient();

    try {
      const data = await prisma.userInfo.findFirst({
        where: { userId },
      });
      return data;
    } catch (error: any) {
      if (error.code === "P2025") return null;
      throw new HTTPException(400, { message: error.message });
    }
  }

  async insertDefault(userId: string, language?: string, belt?: Belt) {
    const prisma = this.getClient();

    try {
      const data = await prisma.userInfo.create({
        data: { userId, language, belt },
      });
      return data;
    } catch (error: any) {
      throw new HTTPException(400, { message: error.message });
    }
  }

  async getByAuthenticatedUser() {
    const { prisma, user } = await this.getClientAndUser();

    try {
      const data = await prisma.userInfo.findFirst({
        where: { userId: user.id },
      });

      if (!data) {
        throw new HTTPException(404, { message: "User info not found" });
      }

      return data;
    } catch (error: any) {
      if (error instanceof HTTPException) throw error;
      throw new HTTPException(400, { message: error.message });
    }
  }

  async getMinimalByAuthenticatedUser(): Promise<{
    userId: string;
    language: string | null;
  } | null> {
    const { prisma, user } = await this.getClientAndUser();

    try {
      const data = await prisma.userInfo.findFirst({
        where: { userId: user.id },
        select: { userId: true, language: true },
      });
      if (!data) return null;
      return {
        userId: data.userId as string,
        language: data.language ?? null,
      };
    } catch (error: any) {
      if (error instanceof HTTPException) throw error;
      throw new HTTPException(400, { message: error.message });
    }
  }

  async updateLanguageForAuthenticatedUser(language: string) {
    const { prisma, user } = await this.getClientAndUser();

    try {
      const data = await prisma.userInfo.update({
        where: { userId: user.id },
        data: { language },
      });
      return data;
    } catch (error: any) {
      throw new HTTPException(400, { message: error.message });
    }
  }
}
