import dayjs from "dayjs";
import type { MiddlewareHandler } from "hono";
import { logger } from "./logger.js";
import { getAuthContext } from "./authContext.js";

export const loggerMiddleware: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  const { method, url } = c.req;
  const path = new URL(url).pathname;

  const isStripeWebhook =
    !!c.req.header("stripe-signature") || path.startsWith("/api/stripe/webhook");
  const contentType = (c.req.header("content-type") || "").toLowerCase();
  const shouldTryBody =
    ["POST", "PUT", "PATCH"].includes(method) && !isStripeWebhook;

  let requestBody: unknown = null;
  if (shouldTryBody) {
    try {
      const rawClone = c.req.raw.clone();
      const text = await rawClone.text();
      if (contentType.includes("application/json")) {
        requestBody = text ? JSON.parse(text) : null;
      } else if (contentType.includes("text/plain")) {
        requestBody = text || null;
      } else if (contentType.includes("multipart/form-data")) {
        requestBody = "[multipart/form-data]";
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        requestBody = "[form-urlencoded]";
      }
    } catch {
      requestBody = null;
    }
  }

  await next();

  const status = c.res.status;
  const duration = Date.now() - start;
  const time = dayjs().format("HH:mm:ss");

  const { userId, requestId } = getAuthContext();

  const logPayload = {
    method,
    path,
    status,
    duration,
    time,
    userId,
    requestId,
    userAgent: c.req.header("user-agent") || "",
    body: requestBody,
  };

  if (status >= 500) {
    logger.error(logPayload);
  } else if (status >= 400) {
    logger.warn(logPayload);
  } else {
    logger.info(logPayload);
  }
};
