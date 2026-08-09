export interface UserInfoDTO {
  id?: string;
  user_id: string;
  language?: string;
  onboarding_completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MinimalUserInfoDTO {
  user_id: string;
  language: string | null;
  is_god: boolean;
}
