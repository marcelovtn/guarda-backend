import { HTTPException } from "hono/http-exception";
import { paymentService } from "../../payment/services/payment.service.js";
import type { SubscriptionDTO } from "../domains/subscription.types.js";
import {
  SubscriptionRepository,
  subscriptionRepository,
} from "../repositories/subscription.repository.js";

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
          photoKey: subscription.instructor.photoKey,
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
   * Cancels access.
   *
   * Anything with billing attached is cancelled at Stripe and nothing is
   * written here — the row changes when the webhook arrives. Doing both would
   * revoke access while the card kept being charged.
   *
   * Rows with no `stripeSubscriptionId` predate billing (the seed, and the old
   * checkout that granted access directly). Nothing is charging them, so they
   * are still flipped locally.
   *
   * The row is kept as CANCELED rather than deleted, so the student's progress
   * survives if they come back.
   */
  async cancel(instructorSlug: string) {
    const instructor =
      await this.repository.findPublishedInstructorBySlug(instructorSlug);

    const existing = await this.repository.findExisting(instructor.id);

    if (!existing || existing.status === "CANCELED" || existing.deletedAt) {
      throw new HTTPException(404, { message: "Assinatura não encontrada" });
    }

    if (existing.stripeSubscriptionId) {
      await paymentService.cancelStripeSubscription(
        existing.stripeSubscriptionId,
      );
      return;
    }

    return this.repository.cancel(instructor.id);
  }
}

export const subscriptionService = new SubscriptionService();
