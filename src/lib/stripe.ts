/**
 * The single seam between GUARDA and Stripe.
 *
 * Nothing outside `modules/payment` should import this file: a service that
 * reaches for Stripe directly is a service that can grant access without the
 * money having arrived.
 *
 * The client is built lazily, on the same reasoning as `lib/resend.ts` — the
 * server has to boot in an environment with no billing configured (a local
 * database, a CI run, the seed script), and only the checkout path should fail
 * when the key is missing. It fails loudly there rather than silently doing
 * nothing.
 */
import Stripe from "stripe";

/**
 * Pinned on purpose. The SDK defaults to whatever version it shipped with, so
 * upgrading the package would otherwise change API behaviour with no diff to
 * review. Bump this deliberately, reading the changelog for the versions in
 * between.
 */
const API_VERSION = "2026-07-29.dahlia";

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (client) return client;

  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }

  client = new Stripe(key, {
    apiVersion: API_VERSION,
    appInfo: { name: "GUARDA", url: "https://guarda.app" },
  });

  return client;
}

/** The signing secret of the webhook endpoint (`whsec_…`). */
export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  }

  return secret;
}

/**
 * Currency of every price in the product. Stripe wants the amount in the
 * currency's smallest unit, which is what `monthlyPrice` already stores.
 */
export const CURRENCY = "brl";

/**
 * Tags the Checkout Sessions this integration creates, so the Dashboard can
 * tell them apart from any other flow later (a gift link, an annual plan, a
 * campaign). The random suffix is what Stripe asks for.
 */
export const INTEGRATION_IDENTIFIER = "guarda-monthly-kwbdxjqa";
