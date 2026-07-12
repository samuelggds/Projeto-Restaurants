export async function restoreOrderItemsStock(tx, order) {
    const items = Array.isArray(order?.items) ? order.items : [];
    for (const item of items) {
        const productId = Number(item?.productId || 0);
        const quantity = Number(item?.quantity || 0);
        if (!Number.isInteger(productId) || productId <= 0) {
            continue;
        }
        if (!Number.isInteger(quantity) || quantity <= 0) {
            continue;
        }
        const product = await tx.product.findFirst({
            where: {
                id: productId,
                restaurantId: Number(order.restaurantId),
            },
            select: {
                id: true,
                stock: true,
            },
        });
        if (!product) {
            continue;
        }
        const stockValue = product.stock === null || product.stock === undefined
            ? null
            : Number(product.stock);
        // Produtos sem controle de estoque (null) não devem ser alterados.
        if (!Number.isInteger(stockValue) || stockValue < 0) {
            continue;
        }
        await tx.product.update({
            where: {
                id: product.id,
            },
            data: {
                stock: stockValue + quantity,
            },
        });
    }
}
