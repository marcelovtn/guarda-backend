export const publicRoutes = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  FORGOT_PASSWORD: '/auth/forgot-password',
  CONFIRM_EMAIL: '/auth-flow/email-verification',
  REGISTRATION_CONFIRMATION: '/auth-flow/registration-confirmation',
  INTRODUCTION: '/',
  BLOG: '/blog',
}
export const protectedRoutes = {
  HOME: '/home',
  DASHBOARD: '/dashboard',
  TRANSACTIONS: '/transactions',
  GOALS: '/goals',
  CATEGORY: '/category',
  PURCHASE: '/purchase',
  SETTINGS: '/settings',
  SUCCESS_PURCHASE: '/purchase/success',
  FAILED_PURCHASE: '/purchase/failed',
  PROCESSING_PURCHASE: '/purchase/processing',
  PENDING_PURCHASE: '/purchase/pending',
}
export const resetPasswordPath = '/auth/reset-password'
