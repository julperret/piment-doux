import express from "express";
import { getProductById, getListOfProducts } from "../service/products.service.js";
import { BadRequestError } from "../lib/errors.js";
import type { Request, Response, NextFunction } from "express";
import type { FieldOutputTypes } from "../prisma/contract.d";

const productsRouter = express.Router();

function toPublicProduct(product: FieldOutputTypes["public"]["Product"]) {
    return {
        id: product.id,
        slug: product.slug,
        label: product.label,
        description: product.description,
        priceCents: product.priceCents,
        inStock: product.stockQuantity > 0,
    };
}

productsRouter.get("/:id", async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    const rawId = req.params.id;

    const id = Number.parseInt(rawId, 10);
    if (!/^\d+$/.test(rawId) || id < 1 || id > 2147483647) {
        throw new BadRequestError("The product id must be an integer between 1 and 2147483647.");
    }

    const product = await getProductById(id);

    return res.status(200).json(toPublicProduct(product));
});

productsRouter.get("/", async (req: Request, res: Response, _next: NextFunction) => {
    const rawLimit = req.query.limit ?? "12";
    const rawOffset = req.query.offset ?? "0";

    if (typeof rawLimit != "string") throw new BadRequestError("The limit must be an integer between 1 and 20.");
    if (typeof rawOffset != "string")
        throw new BadRequestError("The offset must be an integer between 0 and 2147483647.");

    const limit = Number.parseInt(rawLimit, 10);
    if (!/^\d+$/.test(rawLimit) || limit < 1 || limit > 20) {
        throw new BadRequestError("The limit must be an integer between 1 and 20.");
    }

    const offset = Number.parseInt(rawOffset, 10);
    if (!/^\d+$/.test(rawOffset) || offset < 0 || offset > 2147483647) {
        throw new BadRequestError("The offset must be an integer between 0 and 2147483647.");
    }

    const resultList = await getListOfProducts(limit, offset);

    const total = resultList.total;
    const productList = resultList.productsRange;

    const products = productList.map(toPublicProduct);

    return res.status(200).json({
        total,
        products,
    });
});

export { productsRouter };
