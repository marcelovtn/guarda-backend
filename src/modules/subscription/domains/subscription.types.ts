import type { SubscriptionStatus } from "@prisma/client";

/** A row on the "Meus professores" screen. */
export type SubscriptionDTO = {
  id: string;
  status: SubscriptionStatus;
  /** Cents. */
  monthlyPrice: number;
  renewsAt: Date | null;
  canceledAt: Date | null;
  instructor: {
    id: string;
    slug: string;
    displayName: string;
    photoUrl: string | null;
    trackCount: number;
    lessonCount: number;
    lastPublishedAt: Date | null;
  };
  /** Where the student is inside this instructor's content, if anywhere. */
  currentTrack: {
    slug: string;
    title: string;
    completedCount: number;
    totalCount: number;
  } | null;
};

export type CreateSubscriptionDTO = {
  instructorSlug: string;
};
