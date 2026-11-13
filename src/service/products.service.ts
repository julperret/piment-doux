import { db } from "../prisma/db.js";
import { NotFoundError } from "../lib/errors.js";

async function getProductById(id: number) {
    const product = await db.orm.public.Product.where({ id }).first();

    if (!product || product.deletedAt != null) {
        throw new NotFoundError("The requested product was not found.");
    }

    return product;
}

async function getListOfProducts(limit: number, offset: number) {
    const products = db.orm.public.Product.where({ deletedAt: null });

    const total = await products.aggregate((a) => ({ total: a.count() }));
    const productsRange = await products
        .orderBy((p) => p.id.desc())
        .limit(limit)
        .offset(offset)
        .all();

    return { total: total.total, productsRange };
}

export { getProductById, getListOfProducts };
