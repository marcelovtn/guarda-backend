import { Hono } from "hono";
import { subscriptionService } from "../services/subscription.service.js";

/**
 * Student subscriptions, mounted at /api/subscriptions.
 *
 * Read and cancel only. There is no POST: a subscription is created by paying
 * for it, which starts at POST /api/payment/checkout-session and lands through
 * the Stripe webhook. An endpoint here that wrote the row would be a way to
 * subscribe without paying.
 */
export const subscriptionController = new Hono()
  .get("/", async (c) => {
    return c.json(await subscriptionService.listForCurrentStudent());
  })
  .delete("/:instructorSlug", async (c) => {
    await subscriptionService.cancel(c.req.param("instructorSlug"));
    return c.body(null, 204);
  });
