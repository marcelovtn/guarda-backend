import { serve } from "@hono/node-server";
import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";

// BigInt serialization fix
declare global {
  interface BigInt {
    toJSON(): number;
  }
}

BigInt.prototype.toJSON = function () {
  return Number(this);
};

import { handleError } from "./errors/errorHandler.js";
import { isAllowedOrigin } from "./lib/allowedOrigins.js";
import { auth } from "./lib/auth.js";
import { authContextMiddleware } from "./middlewares/authContext.js";
import { authController } from "./modules/auth/controllers/auth.controller.js";
import {
  instructorController,
  instructorProfileController,
  instructorStudentsController,
} from "./modules/instructor/controllers/instructor.controller.js";
import {
  instructorLessonController,
  lessonController,
} from "./modules/lesson/controllers/lesson.controller.js";
import { platformController } from "./modules/platform/controllers/platform.controller.js";
import { progressController } from "./modules/progress/controllers/progress.controller.js";
import { storageController } from "./modules/storage/controllers/storage.controller.js";
import { subscriptionController } from "./modules/subscription/controllers/subscription.controller.js";
import {
  instructorTrackController,
  trackController,
} from "./modules/track/controllers/track.controller.js";
import { userDataController } from "./modules/userData/controllers/userData.controller.js";
import { userFirstTimeSetupController } from "./modules/userFirstTimeSetup/controllers/userFirstTimeSetup.controller.js";
import { userInfoController } from "./modules/userInfo/controllers/userInfo.controller.js";
import { getStarterLog } from "./utils/initialLogs.js";
import { loggerMiddleware } from "./utils/loggerMiddleware.js";

const hono = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

hono.use(
  "/api/*",
  cors({
    origin: (origin) => (isAllowedOrigin(origin) ? origin : null),
    credentials: true,
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "Cookie",
    ],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length", "Set-Cookie"],
    maxAge: 86400,
  }),
);

hono.use("*", authContextMiddleware);
hono.use("*", loggerMiddleware);

hono.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

hono.options("/api/*", (c) => c.text("", 200));
hono.onError((err, c) => handleError(err, c));

hono.get("/api/hello", (c) => c.text("Hello World!"));

hono.route("/api/auth-custom", authController);
hono.route("/api/storage", storageController);
hono.route("/api/userInfo", userInfoController);
hono.route("/api/user-data", userDataController);
hono.route("/api/onboardIncomingUser", userFirstTimeSetupController);

// --- GUARDA -----------------------------------------------------------------
// Student-facing routes read content scoped by subscription; the /api/instructor
// namespace is for managing your own catalogue and requires an Instructor row.
hono.route("/api/instructors", instructorController);
hono.route("/api/instructor/profile", instructorProfileController);
hono.route("/api/instructor/students", instructorStudentsController);
hono.route("/api/tracks", trackController);
hono.route("/api/instructor/tracks", instructorTrackController);
hono.route("/api/lessons", lessonController);
hono.route("/api/instructor/lessons", instructorLessonController);
hono.route("/api/progress", progressController);
hono.route("/api/subscriptions", subscriptionController);
hono.route("/api/platform", platformController);

serve(
  {
    fetch: hono.fetch,
    port: Number(process.env.PORT) || 3001,
    hostname: "0.0.0.0",
  },
  (info) => {
    getStarterLog(info);
  },
);
