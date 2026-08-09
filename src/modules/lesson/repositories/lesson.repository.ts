import type { TrackCategory } from "@prisma/client";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../../../lib/prisma.js";
import { BaseRepository } from "../../_shared/repositories/base.repository.js";
import type {
  CreateLessonDTO,
  UpdateLessonDTO,
} from "../domains/lesson.types.js";

/** Track context needed to describe where a lesson sits. */
const withTrackContext = {
  module: {
    include: {
      track: {
        select: {
          id: true,
          slug: true,
          title: true,
          category: true,
          published: true,
        },
      },
    },
  },
} as const;

export class LessonRepository extends BaseRepository {
  // --- student reads --------------------------------------------------------

  /**
   * Published lessons from instructors the student can access, newest first.
   *
   * `orphansOnly` backs the "Fora das trilhas" filter: lessons the instructor
   * published without slotting into a track yet.
   */
  async findAccessible(filters: {
    category?: TrackCategory;
    orphansOnly?: boolean;
  }) {
    const instructorIds = await this.getAccessibleInstructorIds();
    if (instructorIds.length === 0) return [];

    return prisma.lesson.findMany({
      where: {
        instructorId: { in: instructorIds },
        status: "PUBLISHED",
        deletedAt: null,
        ...(filters.orphansOnly ? { moduleId: null } : {}),
        ...(filters.category
          ? { module: { track: { category: filters.category } } }
          : {}),
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      include: withTrackContext,
    });
  }

  async findAccessibleById(lessonId: string) {
    const instructorIds = await this.getAccessibleInstructorIds();
    if (instructorIds.length === 0) return null;

    return prisma.lesson.findFirst({
      where: {
        id: lessonId,
        instructorId: { in: instructorIds },
        status: "PUBLISHED",
        deletedAt: null,
      },
      include: {
        ...withTrackContext,
        instructor: {
          select: {
            id: true,
            slug: true,
            displayName: true,
            photoKey: true,
          },
        },
      },
    });
  }

  /** Published lessons of a track, in order — the player sidebar. */
  async findPublishedByTrackId(trackId: string) {
    return prisma.lesson.findMany({
      where: {
        module: { trackId, deletedAt: null },
        status: "PUBLISHED",
        deletedAt: null,
      },
      orderBy: [{ module: { position: "asc" } }, { position: "asc" }],
      select: { id: true, title: true, durationSec: true },
    });
  }

  async findProgress(lessonId: string) {
    return prisma.lessonProgress.findUnique({
      where: {
        studentId_lessonId: { studentId: this.getUserId(), lessonId },
      },
    });
  }

  async isSaved(lessonId: string): Promise<boolean> {
    const saved = await prisma.savedLesson.findUnique({
      where: {
        studentId_lessonId: { studentId: this.getUserId(), lessonId },
      },
      select: { id: true },
    });
    return Boolean(saved);
  }

  async findCompletedIn(lessonIds: string[]): Promise<Set<string>> {
    if (lessonIds.length === 0) return new Set();

    const rows = await prisma.lessonProgress.findMany({
      where: {
        studentId: this.getUserId(),
        lessonId: { in: lessonIds },
        completed: true,
      },
      select: { lessonId: true },
    });

    return new Set(rows.map((r) => r.lessonId));
  }

  // --- instructor reads and writes -----------------------------------------

  async findAllByCurrentInstructor() {
    const instructor = await this.getCurrentInstructor();

    return prisma.lesson.findMany({
      where: { instructorId: instructor.id, deletedAt: null },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      include: withTrackContext,
    });
  }

  /**
   * A lesson owned by the current instructor. Ownership is in the query, not a
   * check afterwards, so no code path can forget it.
   */
  async findOwned(lessonId: string) {
    const instructor = await this.getCurrentInstructor();

    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, instructorId: instructor.id, deletedAt: null },
      include: withTrackContext,
    });

    if (!lesson) {
      throw new HTTPException(404, { message: "Aula não encontrada" });
    }

    return lesson;
  }

  async countViewers(lessonIds: string[]): Promise<Map<string, number>> {
    if (lessonIds.length === 0) return new Map();

    const rows = await prisma.lessonProgress.groupBy({
      by: ["lessonId"],
      where: { lessonId: { in: lessonIds } },
      _count: { _all: true },
    });

    return new Map(rows.map((r) => [r.lessonId, r._count._all]));
  }

  async create(data: CreateLessonDTO) {
    const instructor = await this.getCurrentInstructor();

    const position = data.moduleId
      ? await this.nextPositionIn(data.moduleId)
      : 0;

    return prisma.lesson.create({
      data: {
        instructorId: instructor.id,
        title: data.title,
        description: data.description ?? null,
        videoKey: data.videoKey ?? null,
        durationSec: data.durationSec ?? 0,
        moduleId: data.moduleId ?? null,
        status: data.status ?? "DRAFT",
        position,
        publishedAt: data.status === "PUBLISHED" ? new Date() : null,
      },
      include: withTrackContext,
    });
  }

  async update(lessonId: string, data: UpdateLessonDTO) {
    const current = await this.findOwned(lessonId);

    // Moving into a different module appends to the end of it.
    const movedModule =
      data.moduleId !== undefined && data.moduleId !== current.moduleId;

    const position = movedModule
      ? data.moduleId
        ? await this.nextPositionIn(data.moduleId)
        : 0
      : undefined;

    // Stamp the publication date the first time it goes live, and keep it on
    // later edits so "última aula há 2 dias" stays truthful.
    const goingLive =
      data.status === "PUBLISHED" && current.status !== "PUBLISHED";

    return prisma.lesson.update({
      where: { id: lessonId },
      data: {
        ...data,
        ...(position !== undefined ? { position } : {}),
        ...(goingLive ? { publishedAt: new Date() } : {}),
      },
      include: withTrackContext,
    });
  }

  async softDelete(lessonId: string) {
    await this.findOwned(lessonId);

    await prisma.lesson.update({
      where: { id: lessonId },
      data: { deletedAt: new Date(), moduleId: null },
    });
  }

  /** A module the current instructor owns, or 404. */
  async assertOwnsModule(moduleId: string) {
    const instructor = await this.getCurrentInstructor();

    const module = await prisma.module.findFirst({
      where: {
        id: moduleId,
        deletedAt: null,
        track: { instructorId: instructor.id, deletedAt: null },
      },
      select: { id: true },
    });

    if (!module) {
      throw new HTTPException(404, { message: "Módulo não encontrado" });
    }
  }

  private async nextPositionIn(moduleId: string): Promise<number> {
    const last = await prisma.lesson.findFirst({
      where: { moduleId, deletedAt: null },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    return (last?.position ?? -1) + 1;
  }
}

export const lessonRepository = new LessonRepository();
