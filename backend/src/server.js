import "dotenv/config";

import app from "./app.js";
import http from "http";
import { Server } from "socket.io";
import { socketAuth } from "./socket/socketAuth.js";
import { socketHandler } from "./socket/socketHandler.js";
import { startJobs } from "./modules/billing/jobs/scheduler.js";
import billingJob from "./modules/billing/jobs/BillingJob.js";

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

  billingJob.execute().catch(console.error);
});
