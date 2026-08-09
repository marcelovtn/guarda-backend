import { HTTPException } from "hono/http-exception";
import { getTranslatedErrorMessage } from "./getTranslatedErrorMessage.js";
import type { Context } from "hono";
import { logger } from "../utils/logger.js";
import { getAuthContext } from "../utils/authContext.js";

export function handleError(err: unknown, c: Context) {
  let message = "Erro interno do servidor";
  let status = 500;

  if (err instanceof HTTPException) {
    message = getTranslatedErrorMessage(err.message);
    status = err.status;
  } else if (err instanceof Error) {
    message = getTranslatedErrorMessage(err.message);
    status = 400;
  }

  const { requestId, userId } = getAuthContext();
  // Always log as error to make failures visible in terminal/production
  logger.error(
    { err, requestId, userId, path: c.req.path, method: c.req.method, status },
    "Unhandled error",
  );

  return c.json({ error: message, status, requestId }, status as any);
}
