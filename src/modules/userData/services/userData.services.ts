import { BaseRepository } from "../../_shared/repositories/base.repository.js";
import { UserDataRepository } from "../repositories/userData.repository.js";

export class UserDataService extends BaseRepository {
  private readonly repository: UserDataRepository;

  constructor(repository = new UserDataRepository()) {
    super();
    this.repository = repository;
  }

  async deleteAccount() {
    const userId = this.getUserId();
    const { data, error } = await this.repository.deleteUserAccount(userId);
    if (error || !data) {
      throw new Error(error?.message || "Failed to delete account");
    }

    return { success: true, message: "Account deleted successfully", id: data.id };
  }
}

export const userDataService = new UserDataService();
