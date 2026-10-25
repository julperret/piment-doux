import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { db } from "../prisma/db.js";
import type { Varchar } from "@prisma/orm-postgres/target/codec-types";
import { NotFoundError } from "../lib/errors.js";
import { now } from "@prisma/orm-postgres/contract-builder";

beforeEach(async () => {
    const plan = db.raw.sql`TRUNCATE TABLE products RESTART IDENTITY CASCADE`.affectedCount().build();
    await db.runtime().execute(plan);
});

describe("GET /products/{id}", () => {
    it("returns the public representation of an in-stock product", async () => {
        // Arrange: put a product in pd_test
        const product = await db.orm.public.Product.create({
            slug: "granola-noisettes-sirop-erable-1kg" as Varchar<100>,
            label: "Granola aux noisettes & sirop d'érable - 1kg" as Varchar<100>,
            description: "Granola aux noisettes, avoine, sirop d'érable et beurre de coco.",
            priceCents: 2400,
            stockQuantity: 1,
        });

        // Act: send a real HTTP request to the app
        const response = await request(app).get(`/products/${product.id}`);

        // Assert: check the HTTP response
        expect(response.status).toBe(200);
        expect(response.headers["content-type"]).toMatch(/application\/json/);
        expect(response.body).toEqual({
            id: product.id,
            slug: "granola-noisettes-sirop-erable-1kg",
            label: "Granola aux noisettes & sirop d'érable - 1kg",
            description: "Granola aux noisettes, avoine, sirop d'érable et beurre de coco.",
            priceCents: 2400,
            inStock: true,
        });
    });

    it("reports inStock false when stock is zero", async () => {
        // Arrange
        const product = await db.orm.public.Product.create({
            slug: "granola-noisettes-sirop-erable-1kg" as Varchar<100>,
            label: "Granola aux noisettes & sirop d'érable - 1kg" as Varchar<100>,
            description: "Granola aux noisettes, avoine, sirop d'érable et beurre de coco.",
            priceCents: 2400,
            stockQuantity: 0,
        });

        // Act
        const response = await request(app).get(`/products/${product.id}`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.headers["content-type"]).toMatch(/application\/json/);
        expect(response.body).toEqual({
            id: product.id,
            slug: "granola-noisettes-sirop-erable-1kg",
            label: "Granola aux noisettes & sirop d'érable - 1kg",
            description: "Granola aux noisettes, avoine, sirop d'érable et beurre de coco.",
            priceCents: 2400,
            inStock: false,
        });
    });

    it("returns a 404 problem when the product does not exist", async () => {
        // Arrange
        const product = await db.orm.public.Product.create({
            slug: "granola-noisettes-sirop-erable-1kg" as Varchar<100>,
            label: "Granola aux noisettes & sirop d'érable - 1kg" as Varchar<100>,
            description: "Granola aux noisettes, avoine, sirop d'érable et beurre de coco.",
            priceCents: 2400,
            stockQuantity: 1,
        });

        // Act
        const response = await request(app).get(`/products/${product.id + 1}`);

        // Assert
        expect(response.status).toBe(404);
        expect(response.headers["content-type"]).toMatch(/application\/problem\+json/);
        expect(response.body).toEqual({
            type: "https://piment-doux.example/problems/not-found",
            title: "Not Found",
            status: 404,
            detail: "The requested product was not found.",
        });
    });

    it("returns a 404 problem when the product is soft-deleted", async () => {
        // Arrange
        const product = await db.orm.public.Product.create({
            slug: "granola-noisettes-sirop-erable-1kg" as Varchar<100>,
            label: "Granola aux noisettes & sirop d'érable - 1kg" as Varchar<100>,
            description: "Granola aux noisettes, avoine, sirop d'érable et beurre de coco.",
            priceCents: 2400,
            stockQuantity: 1,
            deletedAt: Temporal.Now.instant(),
        });

        // Act
        const response = await request(app).get(`/products/${product.id}`);

        // Assert
        expect(response.status).toBe(404);
        expect(response.headers["content-type"]).toMatch(/application\/problem\+json/);
        expect(response.body).toEqual({
            type: "https://piment-doux.example/problems/not-found",
            title: "Not Found",
            status: 404,
            detail: "The requested product was not found.",
        });
    });

    it.each(["abc", "0", "-1", "2147483648", "1.5", "1e3", "12abc"])(
        "returns a 400 problem when the id is %s",
        async (id) => {
            // Arrange: none, an invalid id must be rejected whatever the database contains

            // Act
            const response = await request(app).get(`/products/${id}`);

            // Assert
            expect(response.status).toBe(400);
            expect(response.headers["content-type"]).toMatch(/application\/problem\+json/);
            expect(response.body).toEqual({
                type: "about:blank",
                title: "Bad Request",
                status: 400,
                detail: "The product id must be an integer between 1 and 2147483647.",
            });
        },
    );
});

afterAll(async () => {
    await db.close();
});
