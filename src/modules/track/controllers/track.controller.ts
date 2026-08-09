import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type {
  CreateTrackDTO,
  SaveTrackStructureDTO,
  UpdateTrackDTO,
} from "../domains/track.types.js";
import { trackService } from "../services/track.service.js";

/**
 * Student-facing tracks, mounted at /api/tracks.
 * Everything here is scoped to the instructors the student can access.
 */
export const trackController = new Hono()
  .get("/", async (c) => {
    return c.json(await trackService.listForStudent());
  })
  // Registered before /:slug so the literal is not matched as a slug.
  .get("/recommended", async (c) => {
    return c.json(await trackService.getRecommendedForStudent());
  })
  .get("/:slug", async (c) => {
    return c.json(await trackService.getForStudent(c.req.param("slug")));
  });

/**
 * The instructor's own tracks, mounted at /api/instructor/tracks.
 * Drafts are visible here and nowhere else.
 */
export const instructorTrackController = new Hono()
  .get("/", async (c) => {
    return c.json(await trackService.listForInstructor());
  })
  .post("/", async (c) => {
    const body = await c.req.json<CreateTrackDTO>();

    if (!body.title || !body.category || !body.level) {
      throw new HTTPException(400, {
        message: "Campos obrigatórios: title, category, level",
      });
    }

    return c.json(await trackService.create(body), 201);
  })
  .get("/:id", async (c) => {
    return c.json(await trackService.getForInstructor(c.req.param("id")));
  })
  .patch("/:id", async (c) => {
    const body = await c.req.json<UpdateTrackDTO>();
    return c.json(await trackService.update(c.req.param("id"), body));
  })
  .delete("/:id", async (c) => {
    await trackService.remove(c.req.param("id"));
    return c.body(null, 204);
  })
  .put("/:id/structure", async (c) => {
    const body = await c.req.json<SaveTrackStructureDTO>();
    return c.json(await trackService.saveStructure(c.req.param("id"), body));
  });
