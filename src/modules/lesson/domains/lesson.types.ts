import type { PublishStatus, TrackCategory } from "@prisma/client";
import type { VideoProcessingStatus } from "../../../lib/videoProvider.js";

/** Where a lesson sits, or null when it is not in a track yet. */
export type LessonTrackRefDTO = {
  trackId: string;
  trackSlug: string;
  trackTitle: string;
  category: TrackCategory;
  moduleId: string;
  moduleTitle: string;
  /** 1-based ordinal of the module within the track — "Módulo 2". */
  moduleNumber: number;
  /** 1-based index of the lesson within its module. */
  modulePosition: number;
  /** 1-based index across the whole track — what the UI calls "aula 07". */
  trackPosition: number;
};

/** Card in the student's "Vídeos" grid. */
export type LessonListItemDTO = {
  id: string;
  title: string;
  durationSec: number;
  publishedAt: Date | null;
  track: LessonTrackRefDTO | null;
};

/** Everything the player screen needs in one request. */
export type LessonPlaybackDTO = {
  id: string;
  title: string;
  description: string | null;
  durationSec: number;
  /** Null while the video is still uploading or has none yet. */
  videoUrl: string | null;
  processing: VideoProcessingStatus;
  instructor: {
    id: string;
    slug: string;
    displayName: string;
    photoKey: string | null;
    lessonCount: number;
    trackCount: number;
    lastPublishedAt: Date | null;
  };
  track: LessonTrackRefDTO | null;
  progress: { completed: boolean; lastPositionSec: number };
  /** Lessons around this one, for the sidebar. Empty when not in a track. */
  siblings: {
    id: string;
    title: string;
    durationSec: number;
    trackPosition: number;
    completed: boolean;
  }[];
  nextLesson: { id: string; title: string; durationSec: number } | null;
};

/** Row in the instructor's library. */
export type InstructorLessonDTO = {
  id: string;
  title: string;
  durationSec: number;
  status: PublishStatus;
  publishedAt: Date | null;
  hasVideo: boolean;
  track: LessonTrackRefDTO | null;
  /** Students who have progress on this lesson. */
  viewerCount: number;
};

export type CreateLessonDTO = {
  title: string;
  description?: string | null;
  videoKey?: string | null;
  durationSec?: number;
  moduleId?: string | null;
  status?: PublishStatus;
};

export type UpdateLessonDTO = Partial<CreateLessonDTO>;

export type LessonUploadTargetDTO = {
  uploadUrl: string;
  key: string;
  expiresIn: number;
};
