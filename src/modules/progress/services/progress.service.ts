import type { TrackCategory } from "@prisma/client";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../../../lib/prisma.js";
import type { LessonTrackRefDTO } from "../../lesson/domains/lesson.types.js";
import type {
  ContinueWatchingDTO,
  LessonProgressDTO,
  SavedLessonDTO,
} from "../domains/progress.types.js";
import {
  ProgressRepository,
  progressRepository,
} from "../repositories/progress.repository.js";

type LessonWithContext = {
  id: string;
  position: number;
  module: {
    id: string;
    title: string;
    position: number;
    trackId: string;
    track: { id: string; slug: string; title: string; category: TrackCategory };
  } | null;
};

export class ProgressService {
  private readonly repository: ProgressRepository;

  constructor(repository = progressRepository) {
    this.repository = repository;
  }

  /**
   * Called repeatedly while the video plays, so it stays cheap: one access
   * check and one upsert.
   */
  async savePosition(
    lessonId: string,
    lastPositionSec: number,
  ): Promise<LessonProgressDTO> {
    const lesson = await this.repository.findAccessibleLesson(lessonId);

    if (!Number.isFinite(lastPositionSec) || lastPositionSec < 0) {
      throw new HTTPException(400, { message: "Posição inválida" });
    }

    // A player can report slightly past the end on the last tick.
    const clamped = Math.min(Math.round(lastPositionSec), lesson.durationSec);
    const progress = await this.repository.savePosition(lessonId, clamped);

    return this.toDTO(progress);
  }

  async setCompleted(
    lessonId: string,
    completed: boolean,
  ): Promise<LessonProgressDTO> {
    const lesson = await this.repository.findAccessibleLesson(lessonId);
    const progress = await this.repository.setCompleted(
      lessonId,
      completed,
      lesson.durationSec,
    );

    return this.toDTO(progress);
  }

  async getContinueWatching(): Promise<ContinueWatchingDTO | null> {
    const progress = await this.repository.findContinueWatching();
    if (!progress) return null;

    const { lesson } = progress;

    return {
      lessonId: lesson.id,
      title: lesson.title,
      description: lesson.description,
      durationSec: lesson.durationSec,
      lastPositionSec: progress.lastPositionSec,
      remainingSec: Math.max(0, lesson.durationSec - progress.lastPositionSec),
      track: await this.buildTrackRef(lesson),
    };
  }

  async listSaved(): Promise<SavedLessonDTO[]> {
    const saved = await this.repository.listSaved();

    return Promise.all(
      saved.map(async ({ lesson, createdAt }) => ({
        lessonId: lesson.id,
        title: lesson.title,
        durationSec: lesson.durationSec,
        savedAt: createdAt,
        track: await this.buildTrackRef(lesson),
      })),
    );
  }

  async save(lessonId: string) {
    await this.repository.findAccessibleLesson(lessonId);
    await this.repository.save(lessonId);
  }

  async unsave(lessonId: string) {
    await this.repository.unsave(lessonId);
  }

  private toDTO(progress: {
    lessonId: string;
    completed: boolean;
    lastPositionSec: number;
    completedAt: Date | null;
  }): LessonProgressDTO {
    return {
      lessonId: progress.lessonId,
      completed: progress.completed,
      lastPositionSec: progress.lastPositionSec,
      completedAt: progress.completedAt,
    };
  }

  /**
   * Position across the whole track, which is the number the UI shows.
   *
   * Only ever called for one lesson at a time here — the list endpoints that
   * need it in bulk compute it in a single query of their own.
   */
  private async buildTrackRef(
    lesson: LessonWithContext,
  ): Promise<LessonTrackRefDTO | null> {
    if (!lesson.module) return null;

    const ordered = await prisma.lesson.findMany({
      where: {
        module: { trackId: lesson.module.trackId, deletedAt: null },
        status: "PUBLISHED",
        deletedAt: null,
      },
      orderBy: [{ module: { position: "asc" } }, { position: "asc" }],
      select: { id: true },
    });

    return {
      trackId: lesson.module.track.id,
      trackSlug: lesson.module.track.slug,
      trackTitle: lesson.module.track.title,
      category: lesson.module.track.category,
      moduleId: lesson.module.id,
      moduleTitle: lesson.module.title,
      moduleNumber: lesson.module.position + 1,
      modulePosition: lesson.position + 1,
      trackPosition: ordered.findIndex((l) => l.id === lesson.id) + 1,
    };
  }
}

export const progressService = new ProgressService();
