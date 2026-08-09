import { HTTPException } from "hono/http-exception";
import { prisma } from "../../../lib/prisma.js";
import { BaseRepository } from "../../_shared/repositories/base.repository.js";

export class SubscriptionRepository extends BaseRepository {
  async listForCurrentStudent() {
    return prisma.subscription.findMany({
      where: { studentId: this.getUserId(), deletedAt: null },
      orderBy: { createdAt: "asc" },
      include: {
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

  async findPublishedInstructorBySlug(slug: string) {
    const instructor = await prisma.instructor.findFirst({
      where: { slug, published: true, deletedAt: null },
      select: { id: true, monthlyPrice: true },
    });

    if (!instructor) {
      throw new HTTPException(404, { message: "Professor não encontrado" });
    }

    return instructor;
  }

  async findExisting(instructorId: string) {
    return prisma.subscription.findUnique({
      where: {
        studentId_instructorId: {
          studentId: this.getUserId(),
          instructorId,
        },
      },
    });
  }

  /**
   * Creates or reactivates the subscription.
   *
   * There is no billing here — the checkout screen writes this row directly.
   * When a real provider lands, only this method changes; everything that
   * reads access already reads this table.
   */
  async activate(instructorId: string, monthlyPrice: number, renewsAt: Date) {
    const studentId = this.getUserId();

    return prisma.subscription.upsert({
      where: { studentId_instructorId: { studentId, instructorId } },
      update: {
        status: "ACTIVE",
        monthlyPrice,
        renewsAt,
        canceledAt: null,
        deletedAt: null,
      },
      create: {
        studentId,
        instructorId,
        status: "ACTIVE",
        monthlyPrice,
        renewsAt,
      },
    });
  }

  async cancel(instructorId: string) {
    const existing = await this.findExisting(instructorId);

    if (!existing || existing.status === "CANCELED") {
      throw new HTTPException(404, { message: "Assinatura não encontrada" });
    }

    return prisma.subscription.update({
      where: { id: existing.id },
      data: { status: "CANCELED", canceledAt: new Date() },
    });
  }

  /**
   * Published lesson count, track count and last publication per instructor,
   * in two grouped queries rather than one pair per subscription.
   */
  async countContent(instructorIds: string[]) {
    const empty = {
      lessons: new Map<string, number>(),
      tracks: new Map<string, number>(),
      latest: new Map<string, Date | null>(),
    };

    if (instructorIds.length === 0) return empty;

    const [lessons, tracks] = await Promise.all([
      prisma.lesson.groupBy({
        by: ["instructorId"],
        where: {
          instructorId: { in: instructorIds },
          status: "PUBLISHED",
          deletedAt: null,
        },
        _count: { _all: true },
        _max: { publishedAt: true },
      }),
      prisma.track.groupBy({
        by: ["instructorId"],
        where: {
          instructorId: { in: instructorIds },
          published: true,
          deletedAt: null,
        },
        _count: { _all: true },
      }),
    ]);

    return {
      lessons: new Map(lessons.map((l) => [l.instructorId, l._count._all])),
      tracks: new Map(tracks.map((t) => [t.instructorId, t._count._all])),
      latest: new Map(
        lessons.map((l) => [l.instructorId, l._max.publishedAt ?? null]),
      ),
    };
  }

  /**
   * The track the student most recently made progress on, per instructor.
   *
   * Backs the "Passagem de Guarda em andamento, aula 07 de 18" line on the
   * subscriptions screen.
   */
  async findCurrentTracks(instructorIds: string[]) {
    if (instructorIds.length === 0) return new Map<string, string>();

    const recent = await prisma.lessonProgress.findMany({
      where: {
        studentId: this.getUserId(),
        lesson: { instructorId: { in: instructorIds }, deletedAt: null },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        lesson: {
          select: {
            instructorId: true,
            module: { select: { trackId: true } },
          },
        },
      },
    });

    const byInstructor = new Map<string, string>();

    for (const row of recent) {
      const trackId = row.lesson.module?.trackId;
      if (!trackId) continue;
      if (!byInstructor.has(row.lesson.instructorId)) {
        byInstructor.set(row.lesson.instructorId, trackId);
      }
    }

    return byInstructor;
  }

  /** Completed vs total published lessons for the given tracks. */
  async getTrackProgress(trackIds: string[]) {
    if (trackIds.length === 0) return new Map();

    const tracks = await prisma.track.findMany({
      where: { id: { in: trackIds } },
      select: {
        id: true,
        slug: true,
        title: true,
        modules: {
          where: { deletedAt: null },
          select: {
            lessons: {
              where: { status: "PUBLISHED", deletedAt: null },
              select: { id: true },
            },
          },
        },
      },
    });

    const lessonIds = tracks.flatMap((t) =>
      t.modules.flatMap((m) => m.lessons.map((l) => l.id)),
    );

    const completed = await prisma.lessonProgress.findMany({
      where: {
        studentId: this.getUserId(),
        lessonId: { in: lessonIds },
        completed: true,
      },
      select: { lessonId: true },
    });

    const completedIds = new Set(completed.map((c) => c.lessonId));

    return new Map(
      tracks.map((track) => {
        const ids = track.modules.flatMap((m) => m.lessons.map((l) => l.id));
        return [
          track.id,
          {
            slug: track.slug,
            title: track.title,
            totalCount: ids.length,
            completedCount: ids.filter((id) => completedIds.has(id)).length,
          },
        ];
      }),
    );
  }
}

export const subscriptionRepository = new SubscriptionRepository();
