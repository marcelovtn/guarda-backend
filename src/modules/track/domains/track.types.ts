import type { TrackCategory, TrackLevel } from "@prisma/client";

/** Card in a category row on the home page, or in the track list. */
export type TrackSummaryDTO = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: TrackCategory;
  level: TrackLevel;
  lessonCount: number;
  totalDurationSec: number;
  /**
   * First lesson in track order. Lets a card send the student straight into
   * the video instead of one more page listing what they already chose.
   */
  firstLessonId: string | null;
  /** Null for a student who has not started this track. */
  progress: TrackProgressDTO | null;
};

export type TrackProgressDTO = {
  completedCount: number;
  totalCount: number;
  /** 0–100, rounded, for the progress bar. */
  percent: number;
  /** The lesson to resume on: first unfinished, or null when done. */
  nextLessonId: string | null;
};

export type TrackDetailDTO = TrackSummaryDTO & {
  instructor: { id: string; slug: string; displayName: string };
  modules: TrackModuleDTO[];
};

export type TrackModuleDTO = {
  id: string;
  title: string;
  position: number;
  lessonCount: number;
  totalDurationSec: number;
  lessons: TrackLessonDTO[];
};

export type TrackLessonDTO = {
  id: string;
  title: string;
  durationSec: number;
  position: number;
  /** Absolute index within the track, which is what the UI numbers by. */
  trackPosition: number;
  completed: boolean;
  lastPositionSec: number;
};

/** Instructor's own view: drafts included, student progress excluded. */
export type InstructorTrackSummaryDTO = {
  id: string;
  slug: string;
  title: string;
  category: TrackCategory;
  level: TrackLevel;
  published: boolean;
  moduleCount: number;
  lessonCount: number;
  totalDurationSec: number;
  studentCount: number;
};

export type CreateTrackDTO = {
  title: string;
  description?: string | null;
  category: TrackCategory;
  level: TrackLevel;
};

export type UpdateTrackDTO = Partial<CreateTrackDTO> & {
  published?: boolean;
};

/**
 * The whole arrangement of a track, saved in one go.
 *
 * The builder screen lets the instructor drag lessons between modules and
 * reorder both, then press "Salvar alterações" once. Sending the final shape
 * as a single payload keeps that atomic — a partial save would leave lessons
 * stranded between modules.
 */
export type SaveTrackStructureDTO = {
  modules: {
    /** Omitted for a module created in this editing session. */
    id?: string;
    title: string;
    lessonIds: string[];
  }[];
};
