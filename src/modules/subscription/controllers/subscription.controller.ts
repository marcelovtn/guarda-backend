import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { CreateSubscriptionDTO } from "../domains/subscription.types.js";
import { subscriptionService } from "../services/subscription.service.js";

/**
 * Student subscriptions, mounted at /api/subscriptions.
 *
 * POST is the checkout screen. It takes no payment — see SubscriptionService.
 */
export const subscriptionController = new Hono()
  .get("/", async (c) => {
    return c.json(await subscriptionService.listForCurrentStudent());
  })
  .post("/", async (c) => {
    const { instructorSlug } = await c.req.json<CreateSubscriptionDTO>();

    if (!instructorSlug) {
      throw new HTTPException(400, {
        message: "Campo obrigatório: instructorSlug",
      });
    }

    return c.json(await subscriptionService.subscribe(instructorSlug), 201);
  })
  .delete("/:instructorSlug", async (c) => {
    await subscriptionService.cancel(c.req.param("instructorSlug"));
    return c.body(null, 204);
  });
