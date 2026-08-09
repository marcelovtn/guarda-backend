import type { Belt } from "@prisma/client";
import { HTTPException } from "hono/http-exception";
import { getAuthContext } from "../../../utils/authContext.js";
import type { MinimalUserInfoDTO, UserInfoDTO } from "../domains/userInfo.types.js";
import { UserInfoRepository } from "../repositories/userInfo.repository.js";

export class UserInfoService {
  private readonly repository: UserInfoRepository;

  constructor(repository = new UserInfoRepository()) {
    this.repository = repository;
  }

  async checkIfUserInfoExists(userId: string) {
    return this.repository.findByUserId(userId);
  }

  private mapToDTO(data: any): UserInfoDTO {
    return {
      id: data.id,
      user_id: data.userId,
      language: data.language,
      onboarding_completed: data.onboardingCompleted ?? false,
      createdAt: data.createdAt?.toISOString(),
      updatedAt: data.updatedAt?.toISOString(),
    };
  }

  async createUserInfo(
    userId: string,
    language?: string,
    belt?: Belt,
  ): Promise<UserInfoDTO> {
    const data = await this.repository.insertDefault(userId, language, belt);
    return this.mapToDTO(data);
  }

  async getUserInfo(): Promise<UserInfoDTO> {
    const data = await this.repository.getByAuthenticatedUser();
    if (!data) throw new HTTPException(404, { message: "User info not found" });
    return this.mapToDTO(data);
  }

  async getMinimalUserInfo(): Promise<MinimalUserInfoDTO> {
    const { userId } = getAuthContext();
    if (!userId) throw new HTTPException(401, { message: "Unauthorized" });
    const godUsers = process.env.GOD_USERS?.split(",").map((id) => id.trim()) ?? [];
    const is_god = godUsers.includes(userId);
    const data = await this.repository.getMinimalByAuthenticatedUser();
    if (!data) {
      return { user_id: userId, language: null, is_god };
    }
    return { user_id: data.userId, language: data.language, is_god };
  }

  async updateLanguage(language: string): Promise<UserInfoDTO> {
    const updated = await this.repository.updateLanguageForAuthenticatedUser(language);
    if (!updated) throw new HTTPException(404, { message: "User info not found" });
    return this.mapToDTO(updated);
  }
}

export const userInfoService = new UserInfoService();
