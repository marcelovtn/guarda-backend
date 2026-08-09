import { Hono } from "hono";
import { userInfoService } from "../services/userInfo.services.js";

export const userInfoController = new Hono()
  .post("/checkIfUserInfoExists", async (c) => {
    const userId = await c.req.json();
    return c.json(await userInfoService.checkIfUserInfoExists(userId));
  })
  .post("/createUserInfo", async (c) => {
    const body: { userId: string } = await c.req.json();
    return c.json(await userInfoService.createUserInfo(body.userId));
  })
  .get("/", async (c) => {
    return c.json(await userInfoService.getUserInfo());
  })
  .get("/minimal", async (c) => {
    return c.json(await userInfoService.getMinimalUserInfo());
  })
  .put("/language", async (c) => {
    const body: { language: string } = await c.req.json();
    return c.json(await userInfoService.updateLanguage(body.language));
  });
