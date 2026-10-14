import { describe, it, vi, expect } from "vitest";
import { errorHandler } from "../middlewares/errorHandler.js";
import { NotFoundError, ValidationFailedError, type FieldError } from "../lib/errors.js";
import type { Request, Response } from "express";

function createMockResponse(headersSent: boolean): Response {
    const mock: Partial<Response> = {
        headersSent,
        status: vi.fn(() => res),
        type: vi.fn(() => res),
        json: vi.fn(() => res),
    };
    // Deliberate cast: the mock only implements what errorHandler uses
    const res = mock as Response;
    return res;
}

describe("errorHandler", () => {
    it("maps NotFoundError to a 404 problem+json response", () => {
        // Arrange
        const err = new NotFoundError();
        const res = createMockResponse(false);
        const req = {} as Request;
        const next = vi.fn();

        // Act
        errorHandler(err, req, res, next);

        // Assert
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

    it("delegates to next when headers are already sent", () => {
        // Arrange
        const err = new NotFoundError();
        const res = createMockResponse(true);
        const req = {} as Request;
        const next = vi.fn();

        // Act
        errorHandler(err, req, res, next);

        // Assert: once headers are sent, only Express's default handler can close the connection
        expect(res.status).not.toHaveBeenCalled();
        expect(res.type).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledExactlyOnceWith(err);
    });

    it("maps ValidationFailedError to a 400 problem+json response with errors", () => {
        // Arrange
        const validationErrors: FieldError[] = [
            { pointer: "#/firstName", detail: "must not be empty." },
            { pointer: "#/email", detail: "must be a valid email address." },
        ];
        const err = new ValidationFailedError(validationErrors);
        const res = createMockResponse(false);
        const req = {} as Request;
        const next = vi.fn();

        // Act
        errorHandler(err, req, res, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.type).toHaveBeenCalledWith("application/problem+json");
        expect(res.json).toHaveBeenCalledWith({
            title: "Validation Failed",
            status: 400,
            detail: "The request body contains invalid fields.",
            type: "https://piment-doux.example/problems/validation-failed",
            errors: [
                { pointer: "#/firstName", detail: "must not be empty." },
                { pointer: "#/email", detail: "must be a valid email address." },
            ],
        });
        expect(next).not.toHaveBeenCalled();
    });
});
