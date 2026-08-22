import { prisma } from "../../../lib/prisma.js";
import { BaseRepository } from "../../_shared/repositories/base.repository.js";
import type {
  InstructorStatsDTO,
  InstructorStudentDTO,
  UpdateInstructorProfileDTO,
} from "../domains/instructor.types.js";

export class InstructorRepository extends BaseRepository {
  /** Public profile lookup. Only returns published instructors. */
  async findPublishedBySlug(slug: string) {
    return prisma.instructor.findFirst({
      where: { slug, published: true, deletedAt: null },
    });
  }

  async findByUserId(userId: string) {
    return prisma.instructor.findFirst({
      where: { userId, deletedAt: null },
    });
  }

  /** The Instructor row for whoever is making the request. */
  async findCurrent() {
    return this.findByUserId(this.getUserId());
  }

  /** Conta pela qual o admin identifica quem promover. */
  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true },
    });
  }

  /** Checa se o slug já está tomado, incluindo por professor não publicado. */
  async findBySlug(slug: string) {
    return prisma.instructor.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true },
    });
  }

  async createForUser(
    userId: string,
    data: {
      slug: string;
      displayName: string;
      bio: string | null;
      monthlyPrice: number;
      published: boolean;
    },
  ) {
    return prisma.instructor.create({ data: { userId, ...data } });
  }

  async update(instructorId: string, data: UpdateInstructorProfileDTO) {
    return prisma.instructor.update({
      where: { id: instructorId },
      data,
    });
  }

  /**
   * Lesson count, track count and last publication date.
   *
   * Counts only published content — a draft is not something a student is
   * being offered.
   */
  async getStats(instructorId: string): Promise<InstructorStatsDTO> {
    const [lessonCount, trackCount, latest] = await Promise.all([
      prisma.lesson.count({
        where: { instructorId, status: "PUBLISHED", deletedAt: null },
      }),
      prisma.track.count({
        where: { instructorId, published: true, deletedAt: null },
      }),
      prisma.lesson.findFirst({
        where: {
          instructorId,
          status: "PUBLISHED",
          deletedAt: null,
          publishedAt: { not: null },
        },
        orderBy: { publishedAt: "desc" },
        select: { publishedAt: true },
      }),
    ]);

    return {
      lessonCount,
      trackCount,
      lastPublishedAt: latest?.publishedAt ?? null,
    };
  }

  /**
   * Students subscribed to this instructor, with how far each has got.
   *
   * Progress is counted across the instructor's own lessons only — a student
   * who also subscribes to someone else should not appear further along here
   * because of lessons they watched elsewhere.
   */
  async listStudents(instructorId: string): Promise<InstructorStudentDTO[]> {
    const subscriptions = await prisma.subscription.findMany({
      where: { instructorId, status: "ACTIVE", deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        student: { select: { id: true, name: true, email: true } },
      },
    });

    if (subscriptions.length === 0) return [];

    const studentIds = subscriptions.map((s) => s.student.id);

    const progress = await prisma.lessonProgress.groupBy({
      by: ["studentId"],
      where: {
        studentId: { in: studentIds },
        completed: true,
        lesson: { instructorId, deletedAt: null },
      },
      _count: { _all: true },
      _max: { updatedAt: true },
    });

    const byStudent = new Map(progress.map((p) => [p.studentId, p]));

    return subscriptions.map(({ student, createdAt }) => {
      const stats = byStudent.get(student.id);
      return {
        id: student.id,
        name: student.name,
        email: student.email,
        subscribedAt: createdAt,
        lessonsCompleted: stats?._count._all ?? 0,
        lastActivityAt: stats?._max.updatedAt ?? null,
      };
    });
  }
}

export const instructorRepository = new InstructorRepository();
