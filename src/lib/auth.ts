import bcrypt from "bcrypt";
import { betterAuth } from "better-auth";
import { admin, anonymous, phoneNumber } from "better-auth/plugins";
import { Pool } from "pg";
const isProduction = process.env.NODE_ENV === "production";

const poolConfig = {
  max: parseInt(process.env.DB_POOL_MAX || "5", 10),
  min: parseInt(process.env.DB_POOL_MIN || "0", 10),
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || "30000", 10), // 30s
  connectionTimeoutMillis: parseInt(
    process.env.DB_POOL_CONNECTION_TIMEOUT || "10000",
    10,
  ), // 10s
  allowExitOnIdle: true,
};

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
    ...poolConfig,
  }),

  baseURL: process.env.BACKEND_URL || "http://localhost:3001",

  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "https://jupter.app",
    "https://www.jupter.app",
    "https://api.jupter.app",
  ],
  advanced: {
    cookiePrefix: "am",
    crossSubDomainCookies: {
      enabled: isProduction,
      domain: isProduction ? "jupter.app" : undefined,
    },
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: isProduction,
      httpOnly: true,
      path: "/",
    },
    cookies: {
      state: {
        attributes: {
          sameSite: isProduction ? "none" : "lax",
          secure: isProduction,
        },
      },
    },
  },
  // emailVerification: {
  //   sendVerificationEmail: async ({ user, url, token }, request) => {
  //     const verificationUrl = new URL(url);
  //     verificationUrl.searchParams.set(
  //       "callbackURL",
  //       `${frontendURL}/auth-flow/registration-confirmation?token=${token}`,
  //     );
  //     await sendVerificationEmail(
  //       user.email,
  //       verificationUrl.toString(),
  //       user.name,
  //     );
  //   },
  //   sendOnSignUp: true,
  // },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    password: {
      hash: async (password) => {
        return await bcrypt.hash(password, 10);
      },
      verify: async ({ hash, password }) => {
        return await bcrypt.compare(password, hash);
      },
    },
    // sendResetPassword: async ({ user, url, token }, request) => {
    //   await sendPasswordResetEmail(user.email, url, user.name);
    // },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  user: {
    additionalFields: {
      userMetadata: {
        type: "json",
        required: false,
        input: false,
      },
      appMetadata: {
        type: "json",
        required: false,
        input: false,
      },
      invitedAt: {
        type: "date",
        required: false,
        input: false,
      },
      lastSignInAt: {
        type: "date",
        required: false,
        input: false,
      },
    },
  },
  plugins: [admin(), anonymous(), phoneNumber()],
});
