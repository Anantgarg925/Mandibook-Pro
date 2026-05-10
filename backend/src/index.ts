import "@vibecodeapp/proxy"; // DO NOT REMOVE OTHERWISE VIBECODE PROXY WILL NOT WORK
import { Hono } from "hono";
import { cors } from "hono/cors";
import "./env";
import { sampleRouter } from "./routes/sample";
import { shopsRouter } from "./routes/shops";
import { trucksRouter } from "./routes/trucks";
import { inquiriesRouter } from "./routes/inquiries";
import { buyersRouter } from "./routes/buyers";
import { transactionsRouter } from "./routes/transactions";
import { logger } from "hono/logger";

const app = new Hono();

// CORS middleware - allow all origins during testing phase
app.use("*", cors({ origin: "*", credentials: false }));

// Logging
app.use("*", logger());

// Health check endpoint
app.get("/health", (c) => c.json({ status: "ok" }));

// Routes
app.route("/api/sample", sampleRouter);
app.route("/api/shops", shopsRouter);
app.route("/api/trucks", trucksRouter);
app.route("/api/inquiries", inquiriesRouter);
app.route("/api/buyers", buyersRouter);
app.route("/api/transactions", transactionsRouter);

const port = Number(process.env.PORT) || 3000;

export default {
  port,
  fetch: app.fetch,
};
