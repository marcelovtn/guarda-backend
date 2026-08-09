import type { Lesson, Module } from "@prisma/client";
import { HTTPException } from "hono/http-exception";
import type {
  CreateTrackDTO,
  InstructorTrackSummaryDTO,
  SaveTrackStructureDTO,
  TrackDetailDTO,
  TrackProgressDTO,
  TrackSummaryDTO,
  UpdateTrackDTO,
} from "../domains/track.types.js";
import {
  TrackRepository,
  trackRepository,
} from "../repositories/track.repository.js";

type ModuleWithLessons = Module & { lessons: Lesson[] };

/** URL-safe slug from a Portuguese title. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 52);
}

const sumDuration = (lessons: Lesson[]) =>
  lessons.reduce((total, lesson) => total + lesson.durationSec, 0);

const flatten = (modules: ModuleWithLessons[]) =>
  modules.flatMap((module) => module.lessons);

export class TrackService {
  private readonly repository: TrackRepository;

  constructor(repository = trackRepository) {
    this.repository = repository;
  }

  // --- student --------------------------------------------------------------

  /**
   * Every track the student can watch, with their progress.
   *
   * Returned flat, with the category on each item — the home page groups them
   * into rows, and the tracks page does not.
   */
  async listForStudent(): Promise<TrackSummaryDTO[]> {
    const tracks = await this.repository.findAccessible();
    const allLessons = tracks.flatMap((track) => flatten(track.modules));
    const completed = await this.repository.findCompletedLessonIds(
      allLessons.map((lesson) => lesson.id),
    );

    return tracks.map((track) => {
      const lessons = flatten(track.modules);
      return {
        id: track.id,
        slug: track.slug,
        title: track.title,
        description: track.description,
        category: track.category,
        level: track.level,
        lessonCount: lessons.length,
        totalDurationSec: sumDuration(lessons),
        progress: this.buildProgress(lessons, completed),
      };
    });
  }

  /**
   * The track a student with no history should start on — what the home page
   * offers under "Comece por aqui".
   *
   * Picks the instructor's first beginner track, falling back to their first
   * track. The instructor controls it by ordering their track list, which is
   * the only signal left now that belt rank is gone from the product.
   */
  async getRecommendedForStudent(): Promise<TrackSummaryDTO | null> {
    const tracks = await this.listForStudent();
    if (tracks.length === 0) return null;

    return tracks.find((track) => track.level === "BEGINNER") ?? tracks[0];
  }

  async getForStudent(slug: string): Promise<TrackDetailDTO> {
    const track = await this.repository.findAccessibleBySlug(slug);

    if (!track) {
      throw new HTTPException(404, { message: "Trilha não encontrada" });
    }

    const lessons = flatten(track.modules);
    const lessonIds = lessons.map((lesson) => lesson.id);
    const [completed, positions] = await Promise.all([
      this.repository.findCompletedLessonIds(lessonIds),
      this.repository.findPositions(lessonIds),
    ]);

    // The UI numbers lessons across the whole track ("aula 07 de 18"), not
    // within their module, so the running index is computed here.
    let trackPosition = 0;

    return {
      id: track.id,
      slug: track.slug,
      title: track.title,
      description: track.description,
      category: track.category,
      level: track.level,
      lessonCount: lessons.length,
      totalDurationSec: sumDuration(lessons),
      progress: this.buildProgress(lessons, completed),
      instructor: track.instructor,
      modules: track.modules.map((module) => ({
        id: module.id,
        title: module.title,
        position: module.position,
        lessonCount: module.lessons.length,
        totalDurationSec: sumDuration(module.lessons),
        lessons: module.lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          durationSec: lesson.durationSec,
          position: lesson.position,
          trackPosition: ++trackPosition,
          completed: completed.has(lesson.id),
          lastPositionSec: positions.get(lesson.id) ?? 0,
        })),
      })),
    };
  }

  private buildProgress(
    lessons: Lesson[],
    completed: Set<string>,
  ): TrackProgressDTO | null {
    if (lessons.length === 0) return null;

    const completedCount = lessons.filter((lesson) =>
      completed.has(lesson.id),
    ).length;

    // No progress at all means the student has not started — the UI shows
    // "Você ainda não começou" rather than a 0% bar.
    if (completedCount === 0) return null;

    const next = lessons.find((lesson) => !completed.has(lesson.id));

    return {
      completedCount,
      totalCount: lessons.length,
      percent: Math.round((completedCount / lessons.length) * 100),
      nextLessonId: next?.id ?? null,
    };
  }

  // --- instructor -----------------------------------------------------------

  async listForInstructor(): Promise<InstructorTrackSummaryDTO[]> {
    const tracks = await this.repository.findAllByCurrentInstructor();
    const studentCounts = await this.repository.countStudentsPerTrack(
      tracks.map((track) => track.id),
    );

    return tracks.map((track) => {
      const lessons = flatten(track.modules);
      return {
        id: track.id,
        slug: track.slug,
        title: track.title,
        category: track.category,
        level: track.level,
        published: track.published,
        moduleCount: track.modules.length,
        lessonCount: lessons.length,
        totalDurationSec: sumDuration(lessons),
        studentCount: studentCounts.get(track.id) ?? 0,
      };
    });
  }

  async getForInstructor(trackId: string) {
    return this.repository.findOwned(trackId);
  }

  async create(data: CreateTrackDTO) {
    const title = data.title?.trim();
    if (!title) {
      throw new HTTPException(400, { message: "Título é obrigatório" });
    }

    return this.repository.create({
      ...data,
      title,
      slug: await this.buildUniqueSlug(title),
    });
  }

  async update(trackId: string, data: UpdateTrackDTO) {
    const title = data.title?.trim();

    if (data.title !== undefined && !title) {
      throw new HTTPException(400, { message: "Título é obrigatório" });
    }

    // Renaming re-slugs, so the public URL keeps matching the title.
    const slug = title
      ? await this.buildUniqueSlug(title, trackId)
      : undefined;

    return this.repository.update(trackId, { ...data, title, slug });
  }

  async remove(trackId: string) {
    await this.repository.softDelete(trackId);
  }

  async saveStructure(trackId: string, structure: SaveTrackStructureDTO) {
    if (!Array.isArray(structure?.modules)) {
      throw new HTTPException(400, { message: "Estrutura inválida" });
    }

    for (const module of structure.modules) {
      if (!module.title?.trim()) {
        throw new HTTPException(400, {
          message: "Todo módulo precisa de um nome",
        });
      }
    }

    const allLessonIds = structure.modules.flatMap((m) => m.lessonIds ?? []);
    if (new Set(allLessonIds).size !== allLessonIds.length) {
      throw new HTTPException(400, {
        message: "A mesma aula aparece em mais de um módulo",
      });
    }

    return this.repository.saveStructure(trackId, structure);
  }

  /** Appends -2, -3… when the instructor already has a track with that slug. */
  private async buildUniqueSlug(title: string, excludeTrackId?: string) {
    const base = slugify(title) || "trilha";
    let candidate = base;
    let suffix = 2;

    while (await this.repository.slugExists(candidate, excludeTrackId)) {
      candidate = `${base}-${suffix++}`;
    }

    return candidate;
  }
}

export const trackService = new TrackService();
