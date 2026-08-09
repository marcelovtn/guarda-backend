import { Hono } from "hono";
import { userDataService } from "../services/userData.services.js";

export const userDataController = new Hono().delete("/account", async (c) => {
  return c.json(await userDataService.deleteAccount());
});
