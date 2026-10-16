import express from "express";
import type { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { errorHandler } from "./middlewares/errorHandler.js";
import { NotFoundError } from "./lib/errors.js";

const app = express();

// First, so security headers are set on every response, including body-parser errors
app.use(helmet());

// Middleware to parse JSON bodies
app.use(express.json());

// Sample route
app.get("/", (_req: Request, res: Response): void => {
    res.send("Hello, World!");
});

// Must stay after all routes and before errorHandler: any request reaching it matched no route
app.use((_req: Request, _res: Response, next: NextFunction): void => {
    const err = new NotFoundError();
    next(err);
});

// Must be registered last: Express only forwards errors to middlewares declared after the failing one
app.use(errorHandler);

export { app };
