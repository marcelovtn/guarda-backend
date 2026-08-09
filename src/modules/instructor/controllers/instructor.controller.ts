import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { UpdateInstructorProfileDTO } from "../domains/instructor.types.js";
import { instructorService } from "../services/instructor.service.js";

/**
 * Public instructor endpoints, mounted at /api/instructors.
 *
 * GET /:slug is the only route in the app that serves content to someone who
 * has not subscribed — it is the page that convinces them to.
 */
export const instructorController = new Hono()
  .get("/:slug", async (c) => {
    const slug = c.req.param("slug");
    return c.json(await instructorService.getPublicProfile(slug));
  });

/**
 * The instructor's own profile, mounted at /api/instructor/profile.
 * Everything here requires the requesting user to have an Instructor row.
 */
export const instructorProfileController = new Hono()
  .get("/", async (c) => {
    return c.json(await instructorService.getOwnProfile());
  })
  .patch("/", async (c) => {
    const body = await c.req.json<UpdateInstructorProfileDTO>();

    const allowed: (keyof UpdateInstructorProfileDTO)[] = [
      "displayName",
      "bio",
      "photoKey",
      "monthlyPrice",
      "published",
    ];

    const data = Object.fromEntries(
      Object.entries(body).filter(([key]) =>
        allowed.includes(key as keyof UpdateInstructorProfileDTO),
      ),
    ) as UpdateInstructorProfileDTO;

    if (Object.keys(data).length === 0) {
      throw new HTTPException(400, { message: "Nenhum campo para atualizar" });
    }

    return c.json(await instructorService.updateOwnProfile(data));
  });

/** Students of the current instructor, mounted at /api/instructor/students. */
export const instructorStudentsController = new Hono().get("/", async (c) => {
  return c.json(await instructorService.listOwnStudents());
});
