import Order, { OrderStatus } from '../models/Order';

export function makeOrder(o: {
    customer_id: number,
    total_paid: number,
    total_tax: number,
    total_shipping: number,
    total_discount: number,
    status: OrderStatus
}, id?: number) {
    const order = new Order();
    order.customer_id = o.customer_id;
    order.total_paid = o.total_paid;
    order.total_tax = o.total_tax;
    order.total_shipping = o.total_shipping;
    order.total_discount = o.total_discount;
    order.status = o.status;

    if (id) {
        order.id = id;
    }

    return order;
};