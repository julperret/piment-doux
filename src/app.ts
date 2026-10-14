import express from "express";
import type { Request, Response } from "express";
import { errorHandler } from "./middlewares/errorHandler.js";

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Sample route
app.get("/", (_req: Request, res: Response): void => {
  res.send("Hello, World!");
});

// Must be registered last: Express only forwards errors to middlewares declared after the failing one
app.use(errorHandler);

export { app };
