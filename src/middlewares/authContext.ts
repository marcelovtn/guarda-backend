import type { MiddlewareHandler } from "hono";
import { authContext } from "../utils/authContext.js";
import { auth } from "../lib/auth.js";

/**
 * Middleware de autenticação seguindo o padrão recomendado do Better Auth
 * 
 * Este middleware:
 * 1. Obtém a sessão usando auth.api.getSession() (forma recomendada)
 * 2. Disponibiliza user e session no contexto do Hono (c.set)
 * 3. Disponibiliza userId e accessToken no AsyncLocalStorage para uso em services/repositories
 */
export const authContextMiddleware: MiddlewareHandler = async (c, next) => {
  const requestId = c.req.header("x-request-id") || crypto.randomUUID();
  c.res.headers.set("x-request-id", requestId);

  let userId: string | undefined;
  let accessToken: string | undefined;
  let user = null;
  let session = null;

  try {
    // Better Auth: forma recomendada de obter sessão no servidor
    const sessionResult = await auth.api.getSession({ 
      headers: c.req.raw.headers
    });

    if (sessionResult?.user) {
      user = sessionResult.user;
      session = sessionResult.session;
      userId = sessionResult.user.id;
      accessToken = sessionResult.session?.token;
    }
  } catch (error) {
    // Log apenas erros críticos em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.error('[AuthMiddleware] Erro ao obter sessão:', error);
    }
  }

  // Disponibiliza no contexto do Hono (padrão Better Auth)
  // Permite acesso via c.get("user") e c.get("session") nos handlers
  c.set("user", user);
  c.set("session", session);

  // Disponibiliza no AsyncLocalStorage para uso em services/repositories
  // que não têm acesso direto ao contexto do Hono
  await new Promise<void>((resolve, reject) => {
    authContext.run({ accessToken, requestId, userId }, () => {
      Promise.resolve(next())
        .then(() => resolve())
        .catch(reject);
    });
  });
};
