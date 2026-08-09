import { HTTPException } from "hono/http-exception";
import { prisma } from "../../../lib/prisma.js";
import { BaseRepository } from "../../_shared/repositories/base.repository.js";

/** Track context needed to describe where a lesson sits. */
const withTrackContext = {
  module: {
    include: {
      track: {
        select: { id: true, slug: true, title: true, category: true },
      },
    },
  },
} as const;

export class ProgressRepository extends BaseRepository {
  /**
   * A lesson the current student is allowed to watch.
   *
   * Progress writes go through this, so a student cannot record progress —
   * and therefore appear in an instructor's student list — on content they do
   * not have access to.
   */
  async findAccessibleLesson(lessonId: string) {
    const instructorIds = await this.getAccessibleInstructorIds();

    const lesson =
      instructorIds.length === 0
        ? null
        : await prisma.lesson.findFirst({
            where: {
              id: lessonId,
              instructorId: { in: instructorIds },
              status: "PUBLISHED",
              deletedAt: null,
            },
            select: { id: true, durationSec: true },
          });

    if (!lesson) {
      throw new HTTPException(404, { message: "Aula não encontrada" });
    }

    return lesson;
  }

  async savePosition(lessonId: string, lastPositionSec: number) {
    const studentId = this.getUserId();

    return prisma.lessonProgress.upsert({
      where: { studentId_lessonId: { studentId, lessonId } },
      update: { lastPositionSec },
      create: { studentId, lessonId, lastPositionSec },
    });
  }

  async setCompleted(
    lessonId: string,
    completed: boolean,
    durationSec: number,
  ) {
    const studentId = this.getUserId();

    return prisma.lessonProgress.upsert({
      where: { studentId_lessonId: { studentId, lessonId } },
      update: {
        completed,
        completedAt: completed ? new Date() : null,
        // Finishing snaps the bar to the end; un-finishing rewinds it, so the
        // lesson does not sit at 100% while marked unwatched.
        lastPositionSec: completed ? durationSec : 0,
      },
      create: {
        studentId,
        lessonId,
        completed,
        completedAt: completed ? new Date() : null,
        lastPositionSec: completed ? durationSec : 0,
      },
    });
  }

  /**
   * The most recently touched unfinished lesson, still inside the student's
   * current access. Drives the home page hero.
   */
  async findContinueWatching() {
    const instructorIds = await this.getAccessibleInstructorIds();
    if (instructorIds.length === 0) return null;

    return prisma.lessonProgress.findFirst({
      where: {
        studentId: this.getUserId(),
        completed: false,
        lastPositionSec: { gt: 0 },
        lesson: {
          instructorId: { in: instructorIds },
          status: "PUBLISHED",
          deletedAt: null,
        },
      },
      orderBy: { updatedAt: "desc" },
      include: { lesson: { include: withTrackContext } },
    });
  }

}

export const progressRepository = new ProgressRepository();
