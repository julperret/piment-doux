import { describe, it, vi, expect } from "vitest";
import { errorHandler } from "../middlewares/errorHandler.js";
import { AppError, NotFoundError } from "../lib/errors.js";
import type { Request, Response } from "express";

describe("errorHandler", () => {
    it("maps NotFoundError to a 404 problem+json response", () => {
        // Mock the Express response object. Each method returns the response object itself to allow for method chaining.
        const mock: Partial<Response> = {
            headersSent: false,
            status: vi.fn(() => res),
            type: vi.fn(() => res),
            json: vi.fn(() => res),
        };
        const err = new NotFoundError();
        // Deliberate cast: the mock only implements what errorHandler uses
        const res = mock as Response;
        const req = {} as Request;
        const next = vi.fn();

        // Call the errorHandler with the NotFoundError
        errorHandler(err, req, res, next);

        // Assert that the response methods were called with the expected values
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.type).toHaveBeenCalledWith("application/problem+json");
        expect(res.json).toHaveBeenCalledWith({
            title: "Not Found",
            status: 404,
            detail: "The requested resource could not be found.",
            type: "https://piment-doux.example/problems/not-found",
        });
        expect(next).not.toHaveBeenCalled();
    });
});
