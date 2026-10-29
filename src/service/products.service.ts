import { db } from "../prisma/db.js";
import { NotFoundError } from "../lib/errors.js";

async function getProductById(id: number) {
    const product = await db.orm.public.Product.where({ id }).first();

    if (!product || product.deletedAt != null) {
        throw new NotFoundError("The requested product was not found.");
    }

    return product;
}

export { getProductById };
