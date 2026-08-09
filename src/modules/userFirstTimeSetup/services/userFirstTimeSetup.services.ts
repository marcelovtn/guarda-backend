import { HTTPException } from "hono/http-exception";
import { userInfoService } from "../../userInfo/services/userInfo.services.js";

export class UserFirstTimeSetupService {
  async onboardIncomingUser(userId: string, language?: string) {
    const existingUserInfo = await userInfoService.checkIfUserInfoExists(userId);

    if (!existingUserInfo) {
      const createdUserInfo = await userInfoService.createUserInfo(userId, language);
      if (!createdUserInfo) {
        throw new HTTPException(400, { message: "User info not created" });
      }
      return { userInfo: createdUserInfo };
    }

    return { userInfo: existingUserInfo };
  }
}

export const userFirstTimeSetupServices = new UserFirstTimeSetupService();
