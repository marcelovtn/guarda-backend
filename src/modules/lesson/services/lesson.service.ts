import type { PublishStatus, TrackCategory } from "@prisma/client";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../../../lib/prisma.js";
import { videoProvider } from "../../../lib/videoProvider.js";
import { instructorRepository } from "../../instructor/repositories/instructor.repository.js";
import type {
  CreateLessonDTO,
  InstructorLessonDTO,
  LessonListItemDTO,
  LessonPlaybackDTO,
  LessonTrackRefDTO,
  LessonUploadTargetDTO,
  UpdateLessonDTO,
} from "../domains/lesson.types.js";
import {
  LessonRepository,
  lessonRepository,
} from "../repositories/lesson.repository.js";

/** Lesson as returned by the repository, with its module and track attached. */
type LessonWithContext = {
  id: string;
  title: string;
  durationSec: number;
  publishedAt: Date | null;
  moduleId: string | null;
  position: number;
  module: {
    id: string;
    title: string;
    position: number;
    trackId: string;
    track: {
      id: string;
      slug: string;
      title: string;
      category: TrackCategory;
    };
  } | null;
};

export class LessonService {
  private readonly repository: LessonRepository;

  constructor(repository = lessonRepository) {
    this.repository = repository;
  }

  // --- student --------------------------------------------------------------

  async listForStudent(filters: {
    category?: TrackCategory;
    orphansOnly?: boolean;
  }): Promise<LessonListItemDTO[]> {
    const lessons = await this.repository.findAccessible(filters);
    const positions = await this.buildTrackPositions(lessons);

    return lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      durationSec: lesson.durationSec,
      publishedAt: lesson.publishedAt,
      track: this.buildTrackRef(lesson, positions),
    }));
  }

  async getPlayback(lessonId: string): Promise<LessonPlaybackDTO> {
    const lesson = await this.repository.findAccessibleById(lessonId);

    if (!lesson) {
      throw new HTTPException(404, { message: "Aula não encontrada" });
    }

    const trackId = lesson.module?.trackId ?? null;
    const siblings = trackId
      ? await this.repository.findPublishedByTrackId(trackId)
      : [];

    const [progress, siblingProgress, stats] = await Promise.all([
      this.repository.findProgress(lessonId),
      this.repository.findProgressIn(siblings.map((s) => s.id)),
      instructorRepository.getStats(lesson.instructorId),
    ]);

    const currentIndex = siblings.findIndex((s) => s.id === lessonId);
    const next = currentIndex >= 0 ? siblings[currentIndex + 1] : undefined;

    const positions = new Map(siblings.map((s, index) => [s.id, index + 1]));

    return {
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      durationSec: lesson.durationSec,
      videoUrl: lesson.videoKey
        ? await videoProvider.getPlaybackUrl(lesson.videoKey)
        : null,
      processing: await videoProvider.getProcessingStatus(
        lesson.videoKey ?? "",
      ),
      instructor: {
        id: lesson.instructor.id,
        slug: lesson.instructor.slug,
        displayName: lesson.instructor.displayName,
        photoKey: lesson.instructor.photoKey,
        lessonCount: stats.lessonCount,
        trackCount: stats.trackCount,
        lastPublishedAt: stats.lastPublishedAt,
      },
      track: this.buildTrackRef(lesson, positions),
      progress: {
        completed: progress?.completed ?? false,
        lastPositionSec: progress?.lastPositionSec ?? 0,
      },
      siblings: siblings.map((sibling, index) => ({
        id: sibling.id,
        title: sibling.title,
        durationSec: sibling.durationSec,
        trackPosition: index + 1,
        completed: siblingProgress.get(sibling.id)?.completed ?? false,
        lastPositionSec: siblingProgress.get(sibling.id)?.lastPositionSec ?? 0,
      })),
      nextLesson: next
        ? { id: next.id, title: next.title, durationSec: next.durationSec }
        : null,
    };
  }

  // --- instructor -----------------------------------------------------------

  async listForInstructor(): Promise<InstructorLessonDTO[]> {
    const lessons = await this.repository.findAllByCurrentInstructor();
    const [positions, viewers] = await Promise.all([
      this.buildTrackPositions(lessons),
      this.repository.countViewers(lessons.map((lesson) => lesson.id)),
    ]);

    return lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      durationSec: lesson.durationSec,
      status: lesson.status,
      publishedAt: lesson.publishedAt,
      hasVideo: Boolean(lesson.videoKey),
      track: this.buildTrackRef(lesson, positions),
      viewerCount: viewers.get(lesson.id) ?? 0,
    }));
  }

  async getForInstructor(lessonId: string) {
    return this.repository.findOwned(lessonId);
  }

  /**
   * Issues an upload destination for a new lesson video.
   *
   * Goes through VideoProvider rather than the storage module, so switching to
   * a streaming service later does not touch this endpoint.
   */
  async createUploadTarget(
    fileName: string,
    contentType: string,
  ): Promise<LessonUploadTargetDTO> {
    const instructor = await instructorRepository.findCurrent();

    if (!instructor) {
      throw new HTTPException(403, { message: "Not an instructor" });
    }

    return videoProvider.createUploadTarget({
      fileName,
      contentType,
      instructorId: instructor.id,
    });
  }

  async create(data: CreateLessonDTO) {
    const title = data.title?.trim();

    if (!title) {
      throw new HTTPException(400, { message: "Título é obrigatório" });
    }

    if (data.moduleId) {
      await this.repository.assertOwnsModule(data.moduleId);
    }

    await this.assertPublishable(data);

    return this.repository.create({ ...data, title });
  }

  async update(lessonId: string, data: UpdateLessonDTO) {
    const current = await this.repository.findOwned(lessonId);
    const title = data.title?.trim();

    if (data.title !== undefined && !title) {
      throw new HTTPException(400, { message: "Título é obrigatório" });
    }

    if (data.moduleId) {
      await this.repository.assertOwnsModule(data.moduleId);
    }

    await this.assertPublishable({
      status: data.status,
      videoKey: data.videoKey ?? current.videoKey,
    });

    return this.repository.update(lessonId, { ...data, title });
  }

  async remove(lessonId: string) {
    await this.repository.softDelete(lessonId);
  }

  /** Backs the "processando 68%" state on the new-lesson screen. */
  async getProcessingStatus(lessonId: string) {
    const lesson = await this.repository.findOwned(lessonId);
    return videoProvider.getProcessingStatus(lesson.videoKey ?? "");
  }

  /**
   * A lesson cannot go live without a playable video — otherwise a student
   * opens it and finds an empty player.
   */
  private async assertPublishable(data: {
    status?: PublishStatus;
    videoKey?: string | null;
  }) {
    if (data.status !== "PUBLISHED") return;

    if (!data.videoKey) {
      throw new HTTPException(400, {
        message: "Envie o vídeo antes de publicar a aula",
      });
    }

    const processing = await videoProvider.getProcessingStatus(data.videoKey);

    if (processing.state !== "ready") {
      throw new HTTPException(400, {
        message: "O vídeo ainda está sendo processado",
      });
    }
  }

  // --- helpers --------------------------------------------------------------

  private buildTrackRef(
    lesson: LessonWithContext,
    positions: Map<string, number>,
  ): LessonTrackRefDTO | null {
    if (!lesson.module) return null;

    return {
      trackId: lesson.module.track.id,
      trackSlug: lesson.module.track.slug,
      trackTitle: lesson.module.track.title,
      category: lesson.module.track.category,
      moduleId: lesson.module.id,
      moduleTitle: lesson.module.title,
      moduleNumber: lesson.module.position + 1,
      modulePosition: lesson.position + 1,
      trackPosition: positions.get(lesson.id) ?? lesson.position + 1,
    };
  }

  /**
   * Index of every lesson within its track, in one query for the whole page.
   *
   * The UI numbers lessons across the track ("aula 07 de 18"), so the position
   * stored on the row — which is per module — is not the number to show.
   */
  private async buildTrackPositions(
    lessons: LessonWithContext[],
  ): Promise<Map<string, number>> {
    const trackIds = [
      ...new Set(
        lessons
          .map((lesson) => lesson.module?.trackId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    if (trackIds.length === 0) return new Map();

    const ordered = await prisma.lesson.findMany({
      where: {
        module: { trackId: { in: trackIds }, deletedAt: null },
        status: "PUBLISHED",
        deletedAt: null,
      },
      orderBy: [{ module: { position: "asc" } }, { position: "asc" }],
      select: { id: true, module: { select: { trackId: true } } },
    });

    const counters = new Map<string, number>();
    const positions = new Map<string, number>();

    for (const lesson of ordered) {
      const trackId = lesson.module!.trackId;
      const next = (counters.get(trackId) ?? 0) + 1;
      counters.set(trackId, next);
      positions.set(lesson.id, next);
    }

    return positions;
  }
}

export const lessonService = new LessonService();
