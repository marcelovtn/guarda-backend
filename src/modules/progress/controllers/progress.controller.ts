import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { SaveProgressDTO } from "../domains/progress.types.js";
import { progressService } from "../services/progress.service.js";

/**
 * Student progress, mounted at /api/progress.
 *
 * The literal route is registered before /:lessonId, otherwise Hono would
 * match "continue" as a lesson id.
 */
export const progressController = new Hono()
  .get("/continue", async (c) => {
    return c.json(await progressService.getContinueWatching());
  })
  .put("/:lessonId", async (c) => {
    const { lastPositionSec } = await c.req.json<SaveProgressDTO>();

    if (typeof lastPositionSec !== "number") {
      throw new HTTPException(400, {
        message: "Campo obrigatório: lastPositionSec",
      });
    }

    return c.json(
      await progressService.savePosition(c.req.param("lessonId"), lastPositionSec),
    );
  })
  .post("/:lessonId/complete", async (c) => {
    return c.json(
      await progressService.setCompleted(c.req.param("lessonId"), true),
    );
  })
  .delete("/:lessonId/complete", async (c) => {
    return c.json(
      await progressService.setCompleted(c.req.param("lessonId"), false),
    );
  });
