import express from "express";
import cors from "cors";

import routes from "./routes/index.js";
import billingRoutes from "./modules/billing/routes/BillingRoutes.js";

const app = express();

const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (!isProduction || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

// Parse JSON for all routes
app.use(express.json());

// Billing routes (require JSON body parsing)
app.use("/billing", billingRoutes);

app.use(routes);

export default app;
