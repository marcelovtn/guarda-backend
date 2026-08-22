import type { SubscriptionStatus } from "@prisma/client";

export type CreateCheckoutSessionDTO = {
  instructorSlug: string;
};

/** Both the checkout and the portal answer the same shape: go here. */
export type RedirectDTO = {
  url: string;
};

/**
 * What one Stripe subscription means locally. Built in one place
 * (`PaymentService.project`) so that every event type ends up writing the same
 * fields from the same source, rather than each handler deciding for itself.
 */
export type SubscriptionProjection = {
  studentId: string;
  instructorId: string;
  stripeSubscriptionId: string;
  status: SubscriptionStatus;
  /** Cents, read back from the Stripe price the student actually pays. */
  monthlyPrice: number;
  renewsAt: Date | null;
  canceledAt: Date | null;
};
