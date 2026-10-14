import type { Request, Response, NextFunction } from "express";
import { AppError, ValidationFailedError } from "../lib/errors.js";
import { STATUS_CODES } from "node:http";

function errorHandler(err: unknown, _req: Request, res: Response, next: NextFunction) {
    // If the headers have already been sent, delegate to the default Express error handler
    if (res.headersSent) {
        return next(err);
    }

    // Handle known AppError instances and send a structured error response
    if (err instanceof AppError) {
        const body: Record<string, unknown> = {
            type: err.type,
            title: err.title,
            status: err.status,
            detail: err.detail,
        };

        // Include additional error details for ValidationFailedError
        if (err instanceof ValidationFailedError) {
            body.errors = err.errors;
        }

        // Send the structured error response with the appropriate status code
        res.status(err.status)
            .type("application/problem+json")
            .json(body);
    } else if (typeof err === "object" && err !== null && "status" in err && typeof err.status === "number" && err.status >= 400 && err.status < 500) {
        // Handle other known error types with a status property (e.g., body-parser)
        const status = err.status;
        res.status(status)
            .type("application/problem+json")
            .json({
                type: "about:blank",
                title: STATUS_CODES[status] ?? "Client Error",
                status,
                detail: err instanceof Error ? err.message : "The request could not be understood by the server.",
            });
    } else {
        // For unknown errors, log the error and send a generic 500 Internal Server Error response
        console.error(err);
        res.status(500)
            .type("application/problem+json")
            .json({
                type: "about:blank",
                title: "Internal Server Error",
                status: 500,
                detail: "The server encountered an unexpected condition that prevented it from fulfilling the request.",
            });
    }
}

export { errorHandler };
