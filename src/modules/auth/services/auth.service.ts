import { HTTPException } from "hono/http-exception";
import type {
  AuthResponse,
  LoginFormValues,
  RegisterFormValues,
} from "../domains/types.js";
import { AuthRepository } from "../repositories/auth.repository.js";

export class AuthService {
  private readonly repository: AuthRepository;

  constructor(repository = new AuthRepository()) {
    this.repository = repository;
  }

  async login(formData: LoginFormValues) {
    throw new HTTPException(501, { message: "Use Better Auth for login" });
  }

  async signup(formData: RegisterFormValues): Promise<AuthResponse> {
    throw new HTTPException(501, { message: "Use Better Auth for signup" });
  }

  async logout() {
    throw new HTTPException(501, { message: "Use Better Auth for logout" });
  }

  async forgotPassword(formData: { email: string }): Promise<AuthResponse> {
    throw new HTTPException(501, {
      message: "Use Better Auth for password reset",
    });
  }

  async verifyOtp(type: string, tokenHash: string): Promise<AuthResponse> {
    throw new HTTPException(501, {
      message: "Use Better Auth for OTP verification",
    });
  }

  async resetPassword(formData: {
    password: string;
    otp: string;
  }): Promise<AuthResponse> {
    throw new HTTPException(501, {
      message: "Use Better Auth for password reset",
    });
  }

  async checkEmailExists(email: string): Promise<{ exists: boolean }> {
    const exists = await this.repository.checkEmailExists(email);
    return { exists };
  }
}

export const authService = new AuthService();
