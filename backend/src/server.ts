import "dotenv/config";

import app from "./app.js";
import http from "http";
import { Server } from "socket.io";
import { Sentry } from "./config/sentry.js";
import { socketAuth } from "./socket/socketAuth.js";
import { socketHandler } from "./socket/socketHandler.js";
import { startJobs } from "./modules/billing/jobs/scheduler.js";
import billingJob from "./modules/billing/jobs/BillingJob.js";
import { notifyCriticalError } from "./services/alertNotifier.js";
import { validateCriticalEnv } from "./config/validateEnv.js";

validateCriticalEnv();

const server = http.createServer(app);
const port = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === "production";
const socketAllowedOrigins = (
  process.env.SOCKET_CORS_ORIGINS ||
  process.env.CORS_ORIGINS ||
  ""
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const io = new Server(server, {
  cors: {
    origin: isProduction ? socketAllowedOrigins : "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["polling", "websocket"],
});

io.use(socketAuth);
io.on("connection", socketHandler);

server.listen(port, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${port}`);
  startJobs();

  billingJob.execute().catch((error) => {
    console.error(error);
    Sentry.captureException(error);
  });
});

process.on("unhandledRejection", (reason) => {
  console.error("[UNHANDLED_REJECTION]", reason);
  Sentry.captureException(
    reason instanceof Error ? reason : new Error(String(reason)),
  );
  notifyCriticalError("[UNHANDLED_REJECTION]", String(reason));
});

process.on("uncaughtException", (error) => {
  console.error("[UNCAUGHT_EXCEPTION]", error);
  Sentry.captureException(error);
  notifyCriticalError("[UNCAUGHT_EXCEPTION]", error?.message || "unknown");
});
