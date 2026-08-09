import { Hono } from "hono";
import { prisma } from "../../../lib/prisma.js";

/**
 * Public, unauthenticated counts for the sign-in panel.
 *
 * The auth screen shows how much is on the platform before anyone has an
 * account, so this cannot sit behind a session. It exposes aggregate numbers
 * only — nothing that identifies an instructor or a student.
 */
export const platformController = new Hono().get("/stats", async (c) => {
  const [instructorCount, trackCount, lessonCount] = await Promise.all([
    prisma.instructor.count({ where: { published: true, deletedAt: null } }),
    prisma.track.count({ where: { published: true, deletedAt: null } }),
    prisma.lesson.count({ where: { status: "PUBLISHED", deletedAt: null } }),
  ]);

  return c.json({ instructorCount, trackCount, lessonCount });
});
