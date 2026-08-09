import { TrackCategory } from "@prisma/client";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type {
  CreateLessonDTO,
  UpdateLessonDTO,
} from "../domains/lesson.types.js";
import { lessonService } from "../services/lesson.service.js";

function parseCategory(value: string | undefined): TrackCategory | undefined {
  if (!value) return undefined;

  if (!(value in TrackCategory)) {
    throw new HTTPException(400, { message: `Categoria inválida: ${value}` });
  }

  return value as TrackCategory;
}

/**
 * Student-facing lessons, mounted at /api/lessons.
 *
 * `?orphans=true` is the "Fora das trilhas" filter — lessons the instructor
 * published without slotting into a track yet.
 */
export const lessonController = new Hono()
  .get("/", async (c) => {
    return c.json(
      await lessonService.listForStudent({
        category: parseCategory(c.req.query("category")),
        orphansOnly: c.req.query("orphans") === "true",
      }),
    );
  })
  .get("/:id", async (c) => {
    return c.json(await lessonService.getPlayback(c.req.param("id")));
  });

/** The instructor's own library, mounted at /api/instructor/lessons. */
export const instructorLessonController = new Hono()
  .get("/", async (c) => {
    return c.json(await lessonService.listForInstructor());
  })
  // Registered before /:id so the literal path is not swallowed by the param.
  .post("/upload-target", async (c) => {
    const { fileName, contentType } = await c.req.json<{
      fileName: string;
      contentType: string;
    }>();

    if (!fileName || !contentType) {
      throw new HTTPException(400, {
        message: "Campos obrigatórios: fileName, contentType",
      });
    }

    return c.json(await lessonService.createUploadTarget(fileName, contentType));
  })
  .post("/", async (c) => {
    const body = await c.req.json<CreateLessonDTO>();
    return c.json(await lessonService.create(body), 201);
  })
  .get("/:id", async (c) => {
    return c.json(await lessonService.getForInstructor(c.req.param("id")));
  })
  .get("/:id/processing", async (c) => {
    return c.json(await lessonService.getProcessingStatus(c.req.param("id")));
  })
  .patch("/:id", async (c) => {
    const body = await c.req.json<UpdateLessonDTO>();
    return c.json(await lessonService.update(c.req.param("id"), body));
  })
  .delete("/:id", async (c) => {
    await lessonService.remove(c.req.param("id"));
    return c.body(null, 204);
  });
