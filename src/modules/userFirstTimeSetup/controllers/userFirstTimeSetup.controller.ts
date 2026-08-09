import { Hono } from "hono";
import { userFirstTimeSetupServices } from "../services/userFirstTimeSetup.services.js";

export const userFirstTimeSetupController = new Hono().post(
  "/:userId",
  async (c) => {
    const userId = c.req.param("userId");
    let body: any = {};
    try {
      body = await c.req.json();
    } catch {
      body = {};
    }
    return c.json(
      await userFirstTimeSetupServices.onboardIncomingUser(userId, body.language)
    );
  }
);
