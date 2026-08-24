import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { CreateCheckoutSessionDTO } from "../domains/payment.types.js";
import { paymentService } from "../services/payment.service.js";

/**
 * Billing, mounted at /api/payment.
 *
 * Two of these routes are for a logged-in student and one is for Stripe.
 * `/webhook` has no session — `authContextMiddleware` populates the context but
 * never blocks, so the handler must not depend on a user being there.
 */
export const paymentController = new Hono()
  .post("/checkout-session", async (c) => {
    const { instructorSlug } = await c.req.json<CreateCheckoutSessionDTO>();

    if (!instructorSlug) {
      throw new HTTPException(400, {
        message: "Campo obrigatório: instructorSlug",
      });
    }

    return c.json(await paymentService.createCheckoutSession(instructorSlug));
  })
  /**
   * Called by the success screen with the id Stripe put in the return URL.
   *
   * Not a replacement for the webhook — the student might never load that page.
   * It is the recovery path for when the webhook is late or was missed.
   */
  .post("/checkout-session/:sessionId/sync", async (c) => {
    return c.json(
      await paymentService.syncCheckoutSession(c.req.param("sessionId")),
    );
  })
  .post("/portal-session", async (c) => {
    return c.json(await paymentService.createPortalSession());
  })
  /**
   * Stripe's endpoint.
   *
   * The body is read as raw text, not JSON: the signature is computed over the
   * exact bytes Stripe sent, so parsing and re-serialising would break
   * verification for a payload that is perfectly valid.
   */
  .post("/webhook", async (c) => {
    const rawBody = await c.req.text();

    await paymentService.handleWebhook(
      rawBody,
      c.req.header("stripe-signature"),
    );

    return c.body(null, 204);
  });
