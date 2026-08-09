import { Hono } from "hono";
import { authService } from "../services/auth.service.js";

export const authController = new Hono()
  // .post("/login", async (c) => {
  //   const formData = await c.req.json();
  //   return c.json(await authService.login(formData));
  // })
  // .post("/signup", async (c) => {
  //   const formData = await c.req.json();
  //   return c.json(await authService.signup(formData));
  // })
  .post("/check-email", async (c) => {
    const { email } = await c.req.json();
    return c.json(await authService.checkEmailExists(email));
  });
// .post("/forgot-password", async (c) => {
//   const formData = await c.req.json();
//   return c.json(await authService.forgotPassword(formData));
// })
// .post("/verify-otp", async (c) => {
//   const { type, tokenHash } = await c.req.json();
//   return c.json(await authService.verifyOtp(type, tokenHash));
// })
// .post("/reset-password", async (c) => {
//   const formData = await c.req.json();
//   return c.json(await authService.resetPassword(formData));
// })
// .post("/logout", async (c) => {
//   return c.json(await authService.logout());
// });
// NOTE: Google OAuth is handled by Better Auth directly at /api/auth/*
// .post('/sign-in-google', async (c) => {
//   return c.json(await authService.signInWithGoogle())
// })
// NOTE: Session is handled by Better Auth at /api/auth/get-session
// .get('/session', async (c) => {
//   return c.json(await authService.getUserSession())
// })
// NOTE: Encryption key is fetched separately, not through auth service
// .get('/encryption-key', async (c) => {
//   return c.json(await authService.fetchAndUnscrambleUserEncryptionKey())
// })
