import { FastifyReply, FastifyRequest } from 'fastify';
import NotEnoughStockError from '../../errors/NotEnoughStockError';
import ProductNotFoundError from '../../errors/ProductNotFoundError';
import { Order, OrderItem, OrderStatus, Product } from '../../models';
import { CreateOrder, OrderItemDTO } from '../../types/CreateOrder.interface';

export default async (
    request: FastifyRequest<{ Body: CreateOrder }>,
    reply: FastifyReply
) => {
    const { customer_id, items } = request.body;

    try {
        const createdOrder = await Order.transaction(async trx => {
            const order = new Order();
            order.customer_id = customer_id;
            order.status = OrderStatus.PaymentPending;
            order.total_discount = items.reduce((acc, item) => {
                acc += item.discount || 0;
                return acc;
            }, 0);
            order.total_paid = 0;
            order.total_tax = 0;
            order.total_shipping = 0;

            const createdOrder = await Order.query(trx).insertAndFetch(order);

            await Promise.all(items.map(async item => {
                if (!item.discount) {
                    item.discount = 0.00;
                }
                const product = await Product.query(trx).findById(item.product_id);
                if (!product) throw new ProductNotFoundError;
                if (product!.stock < item.quantity) throw new NotEnoughStockError;

                const orderItem = new OrderItem();
                orderItem.order_id = createdOrder.id;
                orderItem.product_id = product.id;
                orderItem.quantity = item.quantity;
                orderItem.discount = item.discount;
                orderItem.paid = (product.price * item.quantity) - item.discount;

                // they are set to 0 for business logic purposes
                orderItem.tax = 0;
                orderItem.shipping = 0;

                await OrderItem.query(trx).insert(orderItem);

                createdOrder.total_paid += orderItem.paid;
                createdOrder.total_tax += orderItem.tax;
                createdOrder.total_shipping += orderItem.shipping;
            }));

            return await Order.query(trx).upsertGraphAndFetch(createdOrder);
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
    items: Array<OrderItemDTO>
}
