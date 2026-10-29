import express from "express";
import type { Request, Response, NextFunction } from "express";
import { getProductById as getProductById } from "../service/products.service.js";
import { BadRequestError } from "../lib/errors.js";

const productsRouter = express.Router();

productsRouter.get("/:id", async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    const rawId = req.params.id;

    const id = Number.parseInt(rawId, 10);
    if (!/^\d+$/.test(rawId) || id < 1 || id > 2147483647) {
        throw new BadRequestError("The product id must be an integer between 1 and 2147483647.");
    }

    const product = await getProductById(id);

    return res.status(200).json({
        id: product.id,
        slug: product.slug,
        label: product.label,
        description: product.description,
        priceCents: product.priceCents,
        inStock: product.stockQuantity > 0,
    });
});

export { productsRouter };
