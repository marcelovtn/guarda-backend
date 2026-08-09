import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { getAuthContext } from "../utils/authContext.js";

export const adminRequired: MiddlewareHandler = async (c, next) => {
  const { userId } = getAuthContext();
  if (!userId) throw new HTTPException(401, { message: "Unauthorized" });

  const godUsers =
    process.env.GOD_USERS?.split(",").map((id) => id.trim()) ?? [];
  if (!godUsers.includes(userId)) {
    throw new HTTPException(403, { message: "Forbidden" });
  }

  await next();
};
