import bcrypt from "bcrypt";
import { betterAuth } from "better-auth";
import { admin, anonymous, phoneNumber } from "better-auth/plugins";
import { Pool } from "pg";
import { trustedOrigins } from "./allowedOrigins.js";
const isProduction = process.env.NODE_ENV === "production";

/**
 * Frontend e API compartilham domínio de cookie?
 *
 * É isso que decide `sameSite`, e não uma preferência. Com um apex em comum
 * (`guardabjj.com.br` e `api.guardabjj.com.br`, com COOKIE_DOMAIN preenchido) a
 * requisição é same-site e "lax" basta — que é o valor mais seguro, e o que
 * volta a fazer o middleware do Next e a leitura de sessão no servidor
 * funcionarem, porque o cookie passa a chegar nos dois hosts.
 *
 * Sem COOKIE_DOMAIN, os dois lados estão em hosts sem apex compartilhado — o
 * caso de `*.up.railway.app`, que está na Public Suffix List — e "lax" faria o
 * browser descartar o cookie na chamada do frontend. Aí "none" é o que resta.
 *
 * Derivar em vez de fixar: no dia que o domínio entrar, é variável de ambiente,
 * não deploy de código.
 */
const sharesCookieDomain = Boolean(process.env.COOKIE_DOMAIN);
const crossSiteCookies = isProduction && !sharesCookieDomain;

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

  trustedOrigins: trustedOrigins(),
  advanced: {
    cookiePrefix: "guarda",
    crossSubDomainCookies: {
      enabled: isProduction && sharesCookieDomain,
      domain: isProduction ? process.env.COOKIE_DOMAIN : undefined,
    },
    defaultCookieAttributes: {
      sameSite: crossSiteCookies ? "none" : "lax",
      secure: isProduction,
      httpOnly: true,
      path: "/",
    },
    cookies: {
      state: {
        attributes: {
          sameSite: crossSiteCookies ? "none" : "lax",
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
