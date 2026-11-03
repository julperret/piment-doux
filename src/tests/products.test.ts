import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { db } from "../prisma/db.js";
import type { Varchar } from "@prisma/orm-postgres/target/codec-types";

type ProductOverrides = {
    stockQuantity?: number;
    deletedAt?: Temporal.Instant;
};

async function buildProducts(from: number, to: number, overrides: ProductOverrides = {}) {
    const defaults = { stockQuantity: 1, deletedAt: null };
    const products = [];
    for (let i = from; i <= to; i++) {
        products.push(
            await db.orm.public.Product.create({
                slug: `granola-${i}` as Varchar<100>,
                label: `This is the label test number ${i}.` as Varchar<100>,
                description: `This is the description test number ${i}.`,
                priceCents: 2500,
                ...defaults,
                ...overrides,
            }),
        );
    }
    return products;
}

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
        "returns a 400 problem when the id is %j",
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

describe("GET /products", () => {
    it("returns the first page, newest first, with the default limit", async () => {
        // Arrange
        const expectedPage = (await buildProducts(1, 15)).reverse().slice(0, 12);

        // Act
        const response = await request(app).get(`/products`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.headers["content-type"]).toMatch(/application\/json/);
        expect(response.body).toEqual({
            total: 15,
            products: expectedPage.map((product) => ({
                id: product.id,
                slug: product.slug,
                label: product.label,
                description: product.description,
                priceCents: 2500,
                inStock: true,
            })),
        });
    });

    it("includes out-of-stock products with inStock false", async () => {
        // Arrange
        const inStockProducts = await buildProducts(1, 10);
        const outOfStockProducts = await buildProducts(11, 15, { stockQuantity: 0 });
        const expectedPage = [...inStockProducts, ...outOfStockProducts].reverse().slice(0, 12);

        // Act
        const response = await request(app).get(`/products`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.headers["content-type"]).toMatch(/application\/json/);
        expect(response.body).toEqual({
            total: 15,
            products: expectedPage.map((product) => ({
                id: product.id,
                slug: product.slug,
                label: product.label,
                description: product.description,
                priceCents: 2500,
                inStock: inStockProducts.includes(product),
            })),
        });
    });

    it("excludes soft-deleted products from the list", async () => {
        // Arrange
        const inStockProducts = await buildProducts(1, 10);
        const softDeletedProducts = await buildProducts(11, 15, { deletedAt: Temporal.Now.instant() });
        const expectedPage = [...inStockProducts].reverse();

        // Act
        const response = await request(app).get(`/products`);

        // Arrange
        expect(response.status).toBe(200);
        expect(response.headers["content-type"]).toMatch(/application\/json/);
        expect(response.body).toEqual({
            total: 10,
            products: expectedPage.map((product) => ({
                id: product.id,
                slug: product.slug,
                label: product.label,
                description: product.description,
                priceCents: 2500,
                inStock: inStockProducts.includes(product),
            })),
        });
    });

    it("returns at most `limit` products starting from `offset`", async () => {
        // Arrange
        const expectedPage = (await buildProducts(1, 15)).reverse().slice(5, 10);

        // Act
        const response = await request(app).get(`/products?limit=5&offset=5`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.headers["content-type"]).toMatch(/application\/json/);
        expect(response.body).toEqual({
            total: 15,
            products: expectedPage.map((product) => ({
                id: product.id,
                slug: product.slug,
                label: product.label,
                description: product.description,
                priceCents: 2500,
                inStock: true,
            })),
        });
    });

    it("returns a 400 problem when limit parameter is repeated", async () => {
        // Arrange
        await buildProducts(1, 15);

        // Act
        const response = await request(app).get(`/products?limit=5&limit=6`);

        // Assert
        expect(response.status).toBe(400);
        expect(response.headers["content-type"]).toMatch(/application\/problem\+json/);
        expect(response.body).toEqual({
            type: "about:blank",
            title: "Bad Request",
            status: 400,
            detail: "The limit must be an integer between 1 and 20.",
        });
    });

    it("returns a 400 problem when offset parameter is repeated", async () => {
        // Arrange
        await buildProducts(1, 15);

        // Act
        const response = await request(app).get(`/products?offset=5&offset=6`);

        // Assert
        expect(response.status).toBe(400);
        expect(response.headers["content-type"]).toMatch(/application\/problem\+json/);
        expect(response.body).toEqual({
            type: "about:blank",
            title: "Bad Request",
            status: 400,
            detail: "The offset must be an integer between 0 and 2147483647.",
        });
    });

    it.each(["15", "20"])("returns an empty page when offset is %s", async (offset) => {
        // Arrange
        await buildProducts(1, 15);

        // Act
        const response = await request(app).get(`/products?offset=${offset}`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.headers["content-type"]).toMatch(/application\/json/);
        expect(response.body).toEqual({
            total: 15,
            products: [],
        });
    });

    it.each(["abc", "0", "21", "-1", "1.5", "1e3", "12abc", ""])(
        "returns a 400 problem when limit is %j",
        async (limit) => {
            // Arrange: none, an invalid limit must be rejected whatever the database contains

            // Act
            const response = await request(app).get(`/products?limit=${limit}`);

            // Assert
            expect(response.status).toBe(400);
            expect(response.headers["content-type"]).toMatch(/application\/problem\+json/);
            expect(response.body).toEqual({
                type: "about:blank",
                title: "Bad Request",
                status: 400,
                detail: "The limit must be an integer between 1 and 20.",
            });
        },
    );

    it.each(["abc", "2147483648", "-1", "1.5", "1e3", "12abc", ""])(
        "returns a 400 problem when offset is %j",
        async (offset) => {
            // Arrange: none, an invalid offset must be rejected whatever the database contains

            // Act
            const response = await request(app).get(`/products?offset=${offset}`);

            // Assert
            expect(response.status).toBe(400);
            expect(response.headers["content-type"]).toMatch(/application\/problem\+json/);
            expect(response.body).toEqual({
                type: "about:blank",
                title: "Bad Request",
                status: 400,
                detail: "The offset must be an integer between 0 and 2147483647.",
            });
        },
    );
});

afterAll(async () => {
    await db.close();
});
