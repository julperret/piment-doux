import { describe, it, vi, expect, afterEach } from "vitest";
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

// Restore spied console's error method even when a test fails
afterEach(() => {
    vi.restoreAllMocks();
});

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
        expect(res.status).toHaveBeenCalledExactlyOnceWith(404);
        expect(res.type).toHaveBeenCalledExactlyOnceWith("application/problem+json");
        expect(res.json).toHaveBeenCalledExactlyOnceWith({
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
        expect(res.status).toHaveBeenCalledExactlyOnceWith(400);
        expect(res.type).toHaveBeenCalledExactlyOnceWith("application/problem+json");
        expect(res.json).toHaveBeenCalledExactlyOnceWith({
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

    it("maps unknown errors to a 500 problem+json response", () => {
        // Arrange
        // Spy on console.error to suppress output during the test and verify it was called
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        const err = new Error("Unexpected error");
        const res = createMockResponse(false);
        const req = {} as Request;
        const next = vi.fn();

        // Act
        errorHandler(err, req, res, next);

        // Assert
        expect(consoleErrorSpy).toHaveBeenCalledExactlyOnceWith(err);
        expect(res.status).toHaveBeenCalledExactlyOnceWith(500);
        expect(res.type).toHaveBeenCalledExactlyOnceWith("application/problem+json");
        expect(res.json).toHaveBeenCalledExactlyOnceWith({
            title: "Internal Server Error",
            status: 500,
            detail: "The server encountered an unexpected condition that prevented it from fulfilling the request.",
            type: "about:blank",
        });
        expect(next).not.toHaveBeenCalled();
    });

    it("maps a 4xx Error with status to a problem+json response with its message", () => {
        // Arrange
        const err = Object.assign(new Error("Malformed request."), { status: 400 });
        const res = createMockResponse(false);
        const req = {} as Request;
        const next = vi.fn();

        // Act
        errorHandler(err, req, res, next);

        // Assert
        expect(res.status).toHaveBeenCalledExactlyOnceWith(400);
        expect(res.type).toHaveBeenCalledExactlyOnceWith("application/problem+json");
        expect(res.json).toHaveBeenCalledExactlyOnceWith({
            title: "Bad Request",
            status: 400,
            detail: "Malformed request.",
            type: "about:blank",
        });
        expect(next).not.toHaveBeenCalled();
    });

    it("ignores the message of a non-Error object with a 4xx status", () => {
        // Arrange
        // Only real Errors expose their message: a plain object's message must not leak
        const err = { status: 400, message: "db password is nietzsche" };
        const res = createMockResponse(false);
        const req = {} as Request;
        const next = vi.fn();

        // Act
        errorHandler(err, req, res, next);

        // Assert
        expect(res.status).toHaveBeenCalledExactlyOnceWith(400);
        expect(res.type).toHaveBeenCalledExactlyOnceWith("application/problem+json");
        expect(res.json).toHaveBeenCalledExactlyOnceWith({
            title: "Bad Request",
            status: 400,
            detail: "The request could not be understood by the server.",
            type: "about:blank",
        });
        expect(next).not.toHaveBeenCalled();
    });
});
