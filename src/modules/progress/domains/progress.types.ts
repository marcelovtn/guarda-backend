import type { LessonTrackRefDTO } from "../../lesson/domains/lesson.types.js";

export type SaveProgressDTO = {
  /** Seconds into the video. Clamped to the lesson duration. */
  lastPositionSec: number;
};

export type LessonProgressDTO = {
  lessonId: string;
  completed: boolean;
  lastPositionSec: number;
  completedAt: Date | null;
};

/**
 * What the home page hero shows: the lesson the student was last watching and
 * did not finish.
 */
export type ContinueWatchingDTO = {
  lessonId: string;
  title: string;
  description: string | null;
  durationSec: number;
  lastPositionSec: number;
  /** Seconds left, for the "11:48 restantes de 18:32" line. */
  remainingSec: number;
  track: LessonTrackRefDTO | null;
};

