import { HTTPException } from "hono/http-exception";
import { prisma } from "../../../lib/prisma.js";
import { BaseRepository } from "../../_shared/repositories/base.repository.js";
import type { SubscriptionProjection } from "../domains/payment.types.js";

/**
 * Two kinds of method live here, and mixing them up is the mistake this comment
 * exists to prevent.
 *
 * The first kind runs for a logged-in student and takes the user from
 * `getUserId()`, like every other repository in the codebase. The second kind
 * runs for a Stripe webhook, where there is no session at all — those methods
 * take every id as an argument and must never touch `getUserId()`, which would
 * throw 401 and make Stripe retry forever.
 */
export class PaymentRepository extends BaseRepository {
  // --- Student-initiated -----------------------------------------------------

  async findPublishedInstructorBySlug(slug: string) {
    const instructor = await prisma.instructor.findFirst({
      where: { slug, published: true, deletedAt: null },
      select: {
        id: true,
        slug: true,
        displayName: true,
        monthlyPrice: true,
        stripeProductId: true,
        stripePriceId: true,
      },
    });

    if (!instructor) {
      throw new HTTPException(404, { message: "Professor não encontrado" });
    }

    return instructor;
  }

  /** The current student's identity, for creating the Stripe Customer. */
  async getCurrentUser() {
    const userId = this.getUserId();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      throw new HTTPException(401, { message: "Missing or invalid session" });
    }

    return user;
  }

  async findBillingProfileForCurrentUser() {
    return prisma.billingProfile.findFirst({
      where: { userId: this.getUserId(), deletedAt: null },
      select: { stripeCustomerId: true },
    });
  }

  async saveBillingProfile(userId: string, stripeCustomerId: string) {
    return prisma.billingProfile.upsert({
      where: { userId },
      update: { stripeCustomerId, deletedAt: null },
      create: { userId, stripeCustomerId },
    });
  }

  async saveInstructorPrice(
    instructorId: string,
    stripeProductId: string,
    stripePriceId: string,
  ) {
    return prisma.instructor.update({
      where: { id: instructorId },
      data: { stripeProductId, stripePriceId },
    });
  }

  /** The current student's subscription to one instructor, if any. */
  async findSubscriptionForCurrentStudent(instructorId: string) {
    return prisma.subscription.findUnique({
      where: {
        studentId_instructorId: {
          studentId: this.getUserId(),
          instructorId,
        },
      },
      select: {
        id: true,
        status: true,
        deletedAt: true,
        stripeSubscriptionId: true,
      },
    });
  }

  // --- Webhook (no session) --------------------------------------------------

  /**
   * Writes the local projection of a Stripe subscription.
   *
   * Keyed on the student/instructor pair rather than on the Stripe id, because
   * a student who cancels and comes back gets a new Stripe subscription against
   * the same pair, and their `LessonProgress` hangs off that one row.
   */
  async upsertSubscription(projection: SubscriptionProjection) {
    const {
      studentId,
      instructorId,
      stripeSubscriptionId,
      status,
      monthlyPrice,
      renewsAt,
      canceledAt,
    } = projection;

    return prisma.subscription.upsert({
      where: { studentId_instructorId: { studentId, instructorId } },
      update: {
        stripeSubscriptionId,
        status,
        monthlyPrice,
        renewsAt,
        canceledAt,
        deletedAt: null,
      },
      create: {
        studentId,
        instructorId,
        stripeSubscriptionId,
        status,
        monthlyPrice,
        renewsAt,
        canceledAt,
      },
    });
  }

  /**
   * The stored subscription for a pair, read without a session so the webhook
   * can decide whether an event is stale.
   */
  async findSubscriptionByPair(studentId: string, instructorId: string) {
    return prisma.subscription.findUnique({
      where: { studentId_instructorId: { studentId, instructorId } },
      select: { id: true, status: true, stripeSubscriptionId: true },
    });
  }
}

export const paymentRepository = new PaymentRepository();
