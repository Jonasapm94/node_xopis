import { FastifyReply, FastifyRequest } from 'fastify';
import NotEnoughStockError from '../../errors/NotEnoughStockError';
import ProductNotFoundError from '../../errors/ProductNotFoundError';
import { Order, OrderItem, OrderStatus, Product } from '../../models';
import { CreateOrderRequestType, OrderItemsReplyType } from '../../../src/validations/order.zod';

export default async (
    request: FastifyRequest<{ Body: CreateOrderRequestType }>,
    reply: FastifyReply
) => {
    const { customer_id, items } = request.body;

    try {
        const createdOrder = await Order.transaction(async trx => {
            const order: Partial<Order> = {
                customer_id,
                status: OrderStatus.PaymentPending,
                total_discount: items.reduce((acc, item) => {
                    acc += item.discount || 0;
                    return acc;
                }, 0),
                total_paid: 0,
                total_shipping: 0,
                total_tax: 0
            };

            const createdOrder = await Order.query(trx).insertAndFetch(order);

            await Promise.all(items.map(async item => {
                if (!item.discount) {
                    item.discount = 0.00;
                }

                const product = await Product.query(trx).findById(item.product_id);
                if (!product) throw new ProductNotFoundError;
                if (product!.stock < item.quantity) throw new NotEnoughStockError;

                // they are set to 0 for business logic purposes
                const tax = 0;
                const shipping = 0;

                const paid = (product.price * item.quantity) - item.discount;
                await OrderItem.query(trx).insert({
                    order_id: createdOrder.id,
                    product_id: product.id,
                    quantity: item.quantity,
                    discount: item.discount,
                    paid,
                    tax,
                    shipping,
                });

                const newProductStock = product.stock - item.quantity;
                await product.$query(trx).patch({ stock: newProductStock });

                createdOrder.total_paid += paid;
                createdOrder.total_tax += tax;
                createdOrder.total_shipping += shipping;
            }));

            return await createdOrder.$query(trx).updateAndFetch(createdOrder);
        });

        const responsePayload: OrderCreatedResponsePayload = {
            id: createdOrder.id,
            customer_id: createdOrder.customer_id,
            total_paid: createdOrder.total_paid,
            total_discount: createdOrder.total_discount,
            status: createdOrder.status,
            items
        };

        return reply.status(201).send(responsePayload);
    } catch (error) {
        if (error instanceof ProductNotFoundError) {
            return reply.status(400).send({ message: 'Product not found.' });
        }
        throw error;
    }
};

interface OrderCreatedResponsePayload {
    id: number,
    customer_id: number,
    total_paid: number,
    total_discount: number,
    status: OrderStatus,
    items: OrderItemsReplyType
}
