import { HTTPException } from "hono/http-exception";
import { prisma } from "../../../lib/prisma.js";
import { BaseRepository } from "../../_shared/repositories/base.repository.js";
import type {
  CreateTrackDTO,
  SaveTrackStructureDTO,
  UpdateTrackDTO,
} from "../domains/track.types.js";

/** Published lessons, ordered the way the instructor arranged them. */
const publishedLessons = {
  where: { status: "PUBLISHED" as const, deletedAt: null },
  orderBy: { position: "asc" as const },
};

export class TrackRepository extends BaseRepository {
  // --- student reads --------------------------------------------------------

  /**
   * Published tracks from instructors the student can access.
   *
   * Scoping goes through getAccessibleInstructorIds, never a raw instructorId
   * from the request.
   */
  async findAccessible() {
    const instructorIds = await this.getAccessibleInstructorIds();
    if (instructorIds.length === 0) return [];

    return prisma.track.findMany({
      where: {
        instructorId: { in: instructorIds },
        published: true,
        deletedAt: null,
      },
      orderBy: { position: "asc" },
      include: {
        modules: {
          where: { deletedAt: null },
          orderBy: { position: "asc" },
          include: { lessons: publishedLessons },
        },
      },
    });
  }

  async findAccessibleBySlug(slug: string) {
    const instructorIds = await this.getAccessibleInstructorIds();
    if (instructorIds.length === 0) return null;

    return prisma.track.findFirst({
      where: {
        slug,
        instructorId: { in: instructorIds },
        published: true,
        deletedAt: null,
      },
      include: {
        instructor: { select: { id: true, slug: true, displayName: true } },
        modules: {
          where: { deletedAt: null },
          orderBy: { position: "asc" },
          include: { lessons: publishedLessons },
        },
      },
    });
  }

  /** Completed-lesson ids for the current student, limited to the given set. */
  async findCompletedLessonIds(lessonIds: string[]): Promise<Set<string>> {
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

  /** Playback position per lesson for the current student. */
  async findPositions(lessonIds: string[]): Promise<Map<string, number>> {
    if (lessonIds.length === 0) return new Map();

    const rows = await prisma.lessonProgress.findMany({
      where: { studentId: this.getUserId(), lessonId: { in: lessonIds } },
      select: { lessonId: true, lastPositionSec: true },
    });

    return new Map(rows.map((r) => [r.lessonId, r.lastPositionSec]));
  }

  // --- instructor reads and writes -----------------------------------------

  async findAllByCurrentInstructor() {
    const instructor = await this.getCurrentInstructor();

    return prisma.track.findMany({
      where: { instructorId: instructor.id, deletedAt: null },
      orderBy: { position: "asc" },
      include: {
        modules: {
          where: { deletedAt: null },
          orderBy: { position: "asc" },
          include: {
            lessons: { where: { deletedAt: null }, orderBy: { position: "asc" } },
          },
        },
        _count: { select: { modules: true } },
      },
    });
  }

  /**
   * A track owned by the current instructor.
   *
   * Ownership is part of the query rather than a check afterwards, so there is
   * no path where a forgotten `if` leaks someone else's track.
   */
  async findOwned(trackId: string) {
    const instructor = await this.getCurrentInstructor();

    const track = await prisma.track.findFirst({
      where: { id: trackId, instructorId: instructor.id, deletedAt: null },
      include: {
        modules: {
          where: { deletedAt: null },
          orderBy: { position: "asc" },
          include: {
            lessons: { where: { deletedAt: null }, orderBy: { position: "asc" } },
          },
        },
      },
    });

    if (!track) {
      throw new HTTPException(404, { message: "Trilha não encontrada" });
    }

    return track;
  }

  async countStudentsPerTrack(trackIds: string[]): Promise<Map<string, number>> {
    if (trackIds.length === 0) return new Map();

    // A student "is training" a track when they have progress on any of its
    // lessons — subscribing alone does not put them in the count.
    const rows = await prisma.lessonProgress.findMany({
      where: { lesson: { module: { trackId: { in: trackIds } } } },
      select: { studentId: true, lesson: { select: { module: { select: { trackId: true } } } } },
      distinct: ["studentId", "lessonId"],
    });

    const perTrack = new Map<string, Set<string>>();
    for (const row of rows) {
      const trackId = row.lesson.module?.trackId;
      if (!trackId) continue;
      if (!perTrack.has(trackId)) perTrack.set(trackId, new Set());
      perTrack.get(trackId)!.add(row.studentId);
    }

    return new Map([...perTrack].map(([id, students]) => [id, students.size]));
  }

  async create(data: CreateTrackDTO & { slug: string }) {
    const instructor = await this.getCurrentInstructor();

    const last = await prisma.track.findFirst({
      where: { instructorId: instructor.id, deletedAt: null },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    return prisma.track.create({
      data: {
        instructorId: instructor.id,
        slug: data.slug,
        title: data.title,
        description: data.description ?? null,
        category: data.category,
        level: data.level,
        position: (last?.position ?? -1) + 1,
      },
    });
  }

  async update(trackId: string, data: UpdateTrackDTO & { slug?: string }) {
    await this.findOwned(trackId);

    return prisma.track.update({
      where: { id: trackId },
      data: {
        ...data,
        // Stamp the first publication so the profile can show recency.
        ...(data.published === true ? { publishedAt: new Date() } : {}),
      },
    });
  }

  async softDelete(trackId: string) {
    await this.findOwned(trackId);
    const now = new Date();

    // Lessons survive the track — they go back to being "aula sem trilha"
    // instead of disappearing from the instructor's library.
    await prisma.$transaction([
      prisma.lesson.updateMany({
        where: { module: { trackId } },
        data: { moduleId: null, position: 0 },
      }),
      prisma.module.updateMany({
        where: { trackId },
        data: { deletedAt: now },
      }),
      prisma.track.update({
        where: { id: trackId },
        data: { deletedAt: now },
      }),
    ]);
  }

  /**
   * Replaces the whole module/lesson arrangement of a track in one transaction.
   *
   * Lessons absent from the payload are detached rather than deleted — that is
   * how a lesson goes back to the "sem trilha" pile.
   */
  async saveStructure(trackId: string, structure: SaveTrackStructureDTO) {
    const track = await this.findOwned(trackId);
    const instructor = await this.getCurrentInstructor();

    const incomingLessonIds = structure.modules.flatMap((m) => m.lessonIds);

    // Every lesson being placed must belong to this instructor.
    if (incomingLessonIds.length > 0) {
      const owned = await prisma.lesson.count({
        where: {
          id: { in: incomingLessonIds },
          instructorId: instructor.id,
          deletedAt: null,
        },
      });

      if (owned !== new Set(incomingLessonIds).size) {
        throw new HTTPException(400, {
          message: "Uma das aulas não existe ou não é sua",
        });
      }
    }

    const keptModuleIds = structure.modules
      .map((m) => m.id)
      .filter((id): id is string => Boolean(id));

    await prisma.$transaction(async (tx) => {
      // Detach everything first, so a lesson that moved between modules does
      // not briefly hold two positions.
      await tx.lesson.updateMany({
        where: { module: { trackId } },
        data: { moduleId: null, position: 0 },
      });

      const removedModules = track.modules
        .filter((m) => !keptModuleIds.includes(m.id))
        .map((m) => m.id);

      if (removedModules.length > 0) {
        await tx.module.updateMany({
          where: { id: { in: removedModules } },
          data: { deletedAt: new Date() },
        });
      }

      for (const [moduleIndex, incoming] of structure.modules.entries()) {
        const moduleId = incoming.id
          ? (
              await tx.module.update({
                where: { id: incoming.id },
                data: { title: incoming.title, position: moduleIndex },
              })
            ).id
          : (
              await tx.module.create({
                data: { trackId, title: incoming.title, position: moduleIndex },
              })
            ).id;

        for (const [lessonIndex, lessonId] of incoming.lessonIds.entries()) {
          await tx.lesson.update({
            where: { id: lessonId },
            data: { moduleId, position: lessonIndex },
          });
        }
      }
    });

    return this.findOwned(trackId);
  }

  /** The belt the current student gave at sign-up, if any. */
  async findCurrentStudentBelt() {
    const info = await prisma.userInfo.findUnique({
      where: { userId: this.getUserId() },
      select: { belt: true },
    });

    return info?.belt ?? null;
  }

  /** Slugs are unique per instructor, so uniqueness is checked in that scope. */
  async slugExists(slug: string, excludeTrackId?: string): Promise<boolean> {
    const instructor = await this.getCurrentInstructor();

    const existing = await prisma.track.findFirst({
      where: {
        instructorId: instructor.id,
        slug,
        deletedAt: null,
        ...(excludeTrackId ? { id: { not: excludeTrackId } } : {}),
      },
      select: { id: true },
    });

    return Boolean(existing);
  }
}

export const trackRepository = new TrackRepository();
