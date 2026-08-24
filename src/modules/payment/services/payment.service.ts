import type { SubscriptionStatus } from "@prisma/client";
import { HTTPException } from "hono/http-exception";
import type Stripe from "stripe";
import { frontendUrl } from "../../../lib/allowedOrigins.js";
import {
  CURRENCY,
  getStripe,
  getWebhookSecret,
  INTEGRATION_IDENTIFIER,
} from "../../../lib/stripe.js";
import { logger } from "../../../utils/logger.js";
import type {
  RedirectDTO,
  SubscriptionProjection,
} from "../domains/payment.types.js";
import {
  PaymentRepository,
  paymentRepository,
} from "../repositories/payment.repository.js";

/**
 * Stripe subscription statuses, mapped onto the three the product knows about.
 *
 * `past_due` deliberately keeps its own state instead of collapsing into
 * ACTIVE: the access gate in `BaseRepository.getAccessibleInstructorIds` only
 * accepts ACTIVE, so a student whose card fails loses access while Stripe
 * retries. That is the behaviour the gate already had, not a decision made
 * here — granting a grace period means widening that gate, one line, on
 * purpose.
 */
function toLocalStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
    case "trialing":
      return "ACTIVE";
    case "past_due":
      return "PAST_DUE";
    default:
      // canceled, unpaid, incomplete, incomplete_expired, paused.
      return "CANCELED";
  }
}

function toDate(seconds: number | null | undefined): Date | null {
  return seconds ? new Date(seconds * 1000) : null;
}

export class PaymentService {
  private readonly repository: PaymentRepository;

  constructor(repository = paymentRepository) {
    this.repository = repository;
  }

  // --- Checkout --------------------------------------------------------------

  /**
   * Opens Stripe Checkout for a monthly subscription to one instructor.
   *
   * It grants nothing. The student comes back from Stripe with no more access
   * than they left with — access arrives through the webhook, once the money
   * has. That split is the whole point of this module.
   */
  async createCheckoutSession(instructorSlug: string): Promise<RedirectDTO> {
    const stripe = getStripe();
    const instructor =
      await this.repository.findPublishedInstructorBySlug(instructorSlug);

    if (instructor.monthlyPrice <= 0) {
      throw new HTTPException(409, {
        message: "Esse professor ainda não definiu o valor da assinatura",
      });
    }

    const existing = await this.repository.findSubscriptionForCurrentStudent(
      instructor.id,
    );

    if (existing?.status === "ACTIVE" && !existing.deletedAt) {
      throw new HTTPException(409, { message: "Você já assina esse professor" });
    }

    const user = await this.repository.getCurrentUser();
    const customerId = await this.ensureCustomer(user);
    const priceId = await this.ensurePrice(instructor);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      // Deliberately no `payment_method_types`: leaving it out enables dynamic
      // payment methods, so which methods appear is a Dashboard setting rather
      // than a deploy.
      client_reference_id: user.id,
      metadata: { studentId: user.id, instructorId: instructor.id },
      // The same pair on the subscription itself. Every webhook after checkout
      // carries the subscription, not the session, so this is what lets a
      // renewal three months from now still be mapped back to a student.
      subscription_data: {
        metadata: { studentId: user.id, instructorId: instructor.id },
      },
      integration_identifier: INTEGRATION_IDENTIFIER,
      // The slug travels along so the success screen knows which subscription
      // to wait for — a student can already be paying another instructor.
      success_url: `${frontendUrl()}/subscribe/success?instructor=${instructor.slug}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl()}/subscribe/checkout?instructor=${instructor.slug}`,
    });

    if (!session.url) {
      throw new HTTPException(502, {
        message: "Não foi possível abrir o pagamento",
      });
    }

    return { url: session.url };
  }

  /**
   * The Stripe-hosted billing portal: change card, see invoices, cancel.
   *
   * Cancelling there emits `customer.subscription.deleted`, which the webhook
   * turns into the local row — the same path as everything else.
   */
  async createPortalSession(): Promise<RedirectDTO> {
    const stripe = getStripe();
    const profile = await this.repository.findBillingProfileForCurrentUser();

    if (!profile) {
      throw new HTTPException(404, {
        message: "Nenhuma assinatura encontrada para essa conta",
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripeCustomerId,
      return_url: `${frontendUrl()}/account`,
    });

    return { url: session.url };
  }

  /**
   * Cancels one subscription at Stripe.
   *
   * Nothing is written locally here on purpose: the row changes when the
   * `customer.subscription.deleted` webhook arrives, so there is exactly one
   * writer of subscription state. Flipping the row here as well would take the
   * student's access away while their card kept being charged every month,
   * which is the worst failure this feature has available to it.
   *
   * The caller owns the guards — see `SubscriptionService.cancel`.
   */
  async cancelStripeSubscription(stripeSubscriptionId: string): Promise<void> {
    const stripe = getStripe();
    await stripe.subscriptions.cancel(stripeSubscriptionId);
  }

  /**
   * The other half of the fulfilment Stripe recommends.
   *
   * The webhook is required and stays the primary path, but the docs are
   * explicit that the same function also runs when the student is sent back to
   * the site: "Webhooks trigger this function, and it's called when customers
   * are sent to your website after completing checkout."
   *
   * Without this, a webhook that never arrives — a local `stripe listen` that
   * is not running, an endpoint that was down for a minute — leaves a student
   * who paid with no access and no way to recover but a support message. With
   * it, their own browser coming back is enough.
   *
   * Safe to call repeatedly: it ends in the same idempotent upsert the webhook
   * uses, and it reads the state from Stripe rather than trusting the caller.
   * The only thing the caller supplies is which session to look at, and even
   * that is checked against the session's own metadata.
   */
  async syncCheckoutSession(sessionId: string): Promise<{ settled: boolean }> {
    const stripe = getStripe();
    const user = await this.repository.getCurrentUser();

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // A student may only reconcile their own checkout. Nothing here writes
    // anything Stripe did not say, so this is not the security boundary — but
    // there is no reason to let one account poke at another's session.
    if (session.metadata?.studentId !== user.id) {
      throw new HTTPException(403, { message: "Forbidden" });
    }

    if (session.payment_status === "unpaid") {
      return { settled: false };
    }

    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;

    if (!subscriptionId) return { settled: false };

    await this.syncFromStripe(subscriptionId);

    return { settled: true };
  }

  // --- Stripe objects we own -------------------------------------------------

  /** The Stripe Customer for the current student, created once and reused. */
  private async ensureCustomer(user: {
    id: string;
    email: string;
    name: string;
  }): Promise<string> {
    const existing = await this.repository.findBillingProfileForCurrentUser();
    if (existing) return existing.stripeCustomerId;

    const stripe = getStripe();

    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { studentId: user.id },
    });

    await this.repository.saveBillingProfile(user.id, customer.id);

    return customer.id;
  }

  /**
   * The Stripe Price matching this instructor's `monthlyPrice`.
   *
   * One Product per instructor, because a Checkout line item and an invoice
   * both show the Product name — sharing one Product across instructors would
   * put "GUARDA" on every receipt instead of who the student is paying.
   *
   * Prices are immutable, so a price change means a new Price. The stored id is
   * verified against the current amount rather than trusted: an instructor can
   * edit `monthlyPrice` through the profile screen, which knows nothing about
   * Stripe, and this is the only place that would notice.
   */
  private async ensurePrice(instructor: {
    id: string;
    displayName: string;
    monthlyPrice: number;
    stripeProductId: string | null;
    stripePriceId: string | null;
  }): Promise<string> {
    const stripe = getStripe();
    const productName = `GUARDA · ${instructor.displayName}`;

    if (instructor.stripePriceId) {
      // The product comes back expanded so one call answers both questions:
      // is the amount still right, and is the name on the receipt still right.
      const price = await stripe.prices.retrieve(instructor.stripePriceId, {
        expand: ["product"],
      });

      const product =
        typeof price.product === "object" && !price.product.deleted
          ? price.product
          : null;

      // A rename has to be pushed to Stripe or every future invoice keeps
      // billing the student in the name of whoever the instructor used to be.
      if (product && product.name !== productName) {
        await stripe.products.update(product.id, { name: productName });
      }

      if (price.active && price.unit_amount === instructor.monthlyPrice) {
        return price.id;
      }
    }

    const productId =
      instructor.stripeProductId ??
      (
        await stripe.products.create({
          name: productName,
          metadata: { instructorId: instructor.id },
        })
      ).id;

    const price = await stripe.prices.create({
      product: productId,
      currency: CURRENCY,
      unit_amount: instructor.monthlyPrice,
      recurring: { interval: "month" },
      metadata: { instructorId: instructor.id },
    });

    await this.repository.saveInstructorPrice(
      instructor.id,
      productId,
      price.id,
    );

    return price.id;
  }

  // --- Webhook ---------------------------------------------------------------

  /**
   * The only writer of subscription state.
   *
   * Verifies the signature first — an unverified body is an anonymous request
   * that grants access to the whole catalogue.
   */
  async handleWebhook(rawBody: string, signature: string | undefined) {
    const stripe = getStripe();

    if (!signature) {
      throw new HTTPException(400, { message: "Missing Stripe signature" });
    }

    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(
        rawBody,
        signature,
        getWebhookSecret(),
      );
    } catch (error) {
      logger.warn(
        { err: error },
        "stripe webhook signature verification failed",
      );
      throw new HTTPException(400, { message: "Invalid Stripe signature" });
    }

    await this.route(event);
  }

  /**
   * Every branch ends in the same place: read the subscription back from Stripe
   * and write what it says.
   *
   * Handling events by their payload instead would mean caring about delivery
   * order, and Stripe does not promise any. Re-reading makes a redelivered or
   * out-of-order event harmless — it writes the same current truth.
   */
  private async route(event: Stripe.Event) {
    switch (event.type) {
      // Card payments complete here. Delayed methods arrive unpaid and are
      // fulfilled by async_payment_succeeded instead, which is why the gate on
      // payment_status matters even in a card-only integration.
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;

        if (session.payment_status === "unpaid") {
          logger.info(
            { sessionId: session.id },
            "checkout session still unpaid, waiting for payment",
          );
          return;
        }

        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (!subscriptionId) return;

        await this.syncFromStripe(subscriptionId);
        return;
      }

      case "checkout.session.async_payment_failed": {
        // Nothing to revoke: access was never granted for an unpaid session.
        logger.info(
          { sessionId: event.data.object.id },
          "checkout session payment failed",
        );
        return;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await this.syncFromStripe(event.data.object.id);
        return;
      }

      // Renewals and failed renewals. The subscription moved to a new period
      // (or to past_due) and only re-reading it tells us which.
      case "invoice.paid":
      case "invoice.payment_failed": {
        const details = event.data.object.parent?.subscription_details;
        const subscription = details?.subscription;

        if (!subscription) return;

        await this.syncFromStripe(
          typeof subscription === "string" ? subscription : subscription.id,
        );
        return;
      }

      default:
        return;
    }
  }

  /** Reads one subscription from Stripe and writes the local projection. */
  private async syncFromStripe(stripeSubscriptionId: string) {
    const stripe = getStripe();
    const subscription =
      await stripe.subscriptions.retrieve(stripeSubscriptionId);

    const projection = this.project(subscription);

    if (!projection) return;

    const stored = await this.repository.findSubscriptionByPair(
      projection.studentId,
      projection.instructorId,
    );

    if (this.isStale(stored, projection)) {
      logger.info(
        {
          stripeSubscriptionId,
          storedSubscriptionId: stored?.stripeSubscriptionId,
        },
        "ignoring event for a superseded stripe subscription",
      );
      return;
    }

    await this.repository.upsertSubscription(projection);

    logger.info(
      {
        stripeSubscriptionId,
        studentId: projection.studentId,
        instructorId: projection.instructorId,
        status: projection.status,
      },
      "subscription synced from stripe",
    );
  }

  /**
   * A student who cancels and subscribes again has two Stripe subscriptions
   * against one local row. A late event about the old one must not overwrite
   * the new one — unless it is the old one being reported as live, which cannot
   * happen for a cancelled subscription.
   */
  private isStale(
    stored: { stripeSubscriptionId: string | null } | null,
    projection: SubscriptionProjection,
  ): boolean {
    if (!stored?.stripeSubscriptionId) return false;
    if (stored.stripeSubscriptionId === projection.stripeSubscriptionId) {
      return false;
    }

    return projection.status !== "ACTIVE";
  }

  /**
   * Turns a Stripe subscription into the local row.
   *
   * Returns null when the subscription carries no GUARDA metadata — something
   * created by hand in the Dashboard, which we cannot attribute to a student.
   * Null rather than throwing: a throw would make Stripe retry the event for
   * days over something no retry can fix.
   */
  private project(
    subscription: Stripe.Subscription,
  ): SubscriptionProjection | null {
    const { studentId, instructorId } = subscription.metadata ?? {};

    if (!studentId || !instructorId) {
      logger.warn(
        { stripeSubscriptionId: subscription.id },
        "stripe subscription has no GUARDA metadata, skipping",
      );
      return null;
    }

    // One line item per subscription, by construction — checkout always sends
    // exactly one price.
    const item = subscription.items.data[0];

    return {
      studentId,
      instructorId,
      stripeSubscriptionId: subscription.id,
      status: toLocalStatus(subscription.status),
      monthlyPrice: item?.price.unit_amount ?? 0,
      // Lives on the item, not the subscription: Stripe moved the billing
      // period onto items when it allowed one subscription to bill several
      // cadences at once.
      renewsAt: toDate(item?.current_period_end),
      canceledAt: toDate(subscription.canceled_at),
    };
  }
}

export const paymentService = new PaymentService();
