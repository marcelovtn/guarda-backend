import { HTTPException } from "hono/http-exception";
import type { SubscriptionDTO } from "../domains/subscription.types.js";
import {
  SubscriptionRepository,
  subscriptionRepository,
} from "../repositories/subscription.repository.js";
import { storageService } from "../../storage/services/storage.service.js";

/** Billing is not implemented — renewal is simply one month out. */
function oneMonthFromNow(): Date {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date;
}

export class SubscriptionService {
  private readonly repository: SubscriptionRepository;

  constructor(repository = subscriptionRepository) {
    this.repository = repository;
  }

  async listForCurrentStudent(): Promise<SubscriptionDTO[]> {
    const subscriptions = await this.repository.listForCurrentStudent();
    if (subscriptions.length === 0) return [];

    const instructorIds = subscriptions.map((s) => s.instructorId);

    const [content, currentTrackIds] = await Promise.all([
      this.repository.countContent(instructorIds),
      this.repository.findCurrentTracks(instructorIds),
    ]);

    const trackProgress = await this.repository.getTrackProgress([
      ...new Set(currentTrackIds.values()),
    ]);

    return subscriptions.map((subscription) => {
      const trackId = currentTrackIds.get(subscription.instructorId);
      const progress = trackId ? trackProgress.get(trackId) : undefined;

      return {
        id: subscription.id,
        status: subscription.status,
        monthlyPrice: subscription.monthlyPrice,
        renewsAt: subscription.renewsAt,
        canceledAt: subscription.canceledAt,
        instructor: {
          id: subscription.instructor.id,
          slug: subscription.instructor.slug,
          displayName: subscription.instructor.displayName,
          photoUrl: storageService.resolvePublicUrl(
            subscription.instructor.photoKey,
          ),
          trackCount: content.tracks.get(subscription.instructorId) ?? 0,
          lessonCount: content.lessons.get(subscription.instructorId) ?? 0,
          lastPublishedAt: content.latest.get(subscription.instructorId) ?? null,
        },
        currentTrack: progress
          ? {
              slug: progress.slug,
              title: progress.title,
              completedCount: progress.completedCount,
              totalCount: progress.totalCount,
            }
          : null,
      };
    });
  }

  /**
   * Subscribes the current student to an instructor.
   *
   * No payment is taken. The checkout screen calls this directly and the row
   * it writes is what every access check reads, so the rest of the app behaves
   * exactly as it will once billing exists.
   */
  async subscribe(instructorSlug: string): Promise<SubscriptionDTO> {
    const instructor =
      await this.repository.findPublishedInstructorBySlug(instructorSlug);

    const existing = await this.repository.findExisting(instructor.id);

    if (existing?.status === "ACTIVE" && !existing.deletedAt) {
      throw new HTTPException(409, {
        message: "Você já assina esse professor",
      });
    }

    await this.repository.activate(
      instructor.id,
      instructor.monthlyPrice,
      oneMonthFromNow(),
    );

    const subscriptions = await this.listForCurrentStudent();
    const created = subscriptions.find(
      (s) => s.instructor.id === instructor.id,
    );

    if (!created) {
      throw new HTTPException(500, { message: "Falha ao criar a assinatura" });
    }

    return created;
  }

  /**
   * Cancels access. The row is kept with status CANCELED rather than deleted,
   * so the student's progress survives if they come back.
   */
  async cancel(instructorSlug: string) {
    const instructor =
      await this.repository.findPublishedInstructorBySlug(instructorSlug);

    return this.repository.cancel(instructor.id);
  }
}

export const subscriptionService = new SubscriptionService();
