export interface AuthResponse {
  data?: {
    user?: any | null
    session?: any | null
    url?: string
  }
  error?: string
}

export interface LoginFormValues {
  email: string
  password: string
}

export interface RegisterFormValues extends LoginFormValues {
  username: string
}

export interface ForgotPasswordFormValues {
  email: string
}
export interface ResetPasswordFormValues {
  password: string
  code: string
}
