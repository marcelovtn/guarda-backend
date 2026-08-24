/**
 * Which origins may talk to this API.
 *
 * The blank shipped a hardcoded list belonging to a different product. Here it
 * comes from ALLOWED_ORIGINS (comma-separated) so production is configured
 * rather than edited, and any localhost port is accepted in development —
 * Next.js moves to 3001, 3002 and so on whenever a port is taken, and a CORS
 * failure at that point looks like a broken app rather than a busy port.
 */
const LOCALHOST_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function configuredOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/**
 * Where to send a browser that is coming back from an external flow — today
 * only Stripe Checkout.
 *
 * It cannot be derived from the request: Stripe redirects the student, so the
 * URL has to be absolute and known server-side. FRONTEND_URL wins when set;
 * otherwise the first configured origin, which is already the production front.
 * The localhost fallback is development only, so a missing production config
 * fails loudly instead of redirecting a real student to their own machine.
 */
export function frontendUrl(): string {
  const configured = process.env.FRONTEND_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const [first] = configuredOrigins();
  if (first) return first.replace(/\/$/, "");

  if (process.env.NODE_ENV === "production") {
    throw new Error("FRONTEND_URL is not set");
  }

  return "http://localhost:3000";
}

export function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;

  if (process.env.NODE_ENV !== "production" && LOCALHOST_ORIGIN.test(origin)) {
    return true;
  }

  return configuredOrigins().includes(origin);
}

/**
 * Origins Better Auth will accept redirects and callbacks for.
 *
 * Unlike the CORS check this cannot be a predicate, so development uses Better
 * Auth's port wildcard. An enumerated list was tried first and failed the way
 * these lists always fail: the frontend landed on a port outside it and login
 * answered INVALID_ORIGIN, which reads as a broken app rather than a busy port.
 */
export function trustedOrigins(): string[] {
  const configured = configuredOrigins();

  if (process.env.NODE_ENV === "production") return configured;

  return [
    ...new Set([
      ...configured,
      "http://localhost:*",
      "http://127.0.0.1:*",
    ]),
  ];
}
