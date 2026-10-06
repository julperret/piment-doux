class AppError extends Error {
    readonly type: string;
    readonly title: string;
    readonly status: number;
    readonly detail: string;

    constructor(title: string, status: number, detail: string, type: string = "about:blank") {
        super(detail);
        this.name = new.target.name;
        this.title = title;
        this.status = status;
        this.detail = detail;
        this.type = type;
    }
}

class BadRequestError extends AppError {
    constructor(detail = "Malformed request body.") {
        super("Bad Request", 400, detail);
    }
}

type FieldError = { pointer: string; detail: string };

class ValidationFailedError extends AppError {
    readonly errors: FieldError[];

    constructor(errors: FieldError[], detail = "The request body contains invalid fields.") {
        super("Validation Failed", 400, detail, "https://piment-doux.example/problems/validation-failed");
        this.errors = errors;
    }
}

class UnauthorizedError extends AppError {
    constructor(detail = "The request requires user authentication.") {
        super("Unauthorized", 401, detail);
    }
}

class ForbiddenError extends AppError {
    constructor(detail = "The server understood the request, but is refusing to fulfill it.") {
        super("Forbidden", 403, detail);
    }
}

class NotFoundError extends AppError {
    constructor(detail = "The requested resource could not be found.") {
        super("Not Found", 404, detail, "https://piment-doux.example/problems/not-found");
    }
}

class ConflictError extends AppError {
    constructor(detail = "The request could not be completed due to a conflict with the current state of the resource.") {
        super("Conflict", 409, detail, "https://piment-doux.example/problems/conflict");
    }
}

class InternalServerError extends AppError {
    constructor(detail = "The server encountered an unexpected condition that prevented it from fulfilling the request.") {
        super("Internal Server Error", 500, detail);
    }
}

export { AppError, BadRequestError, ValidationFailedError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, InternalServerError };
export type { FieldError };
