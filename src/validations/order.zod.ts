import z from 'zod';

export const orderItemsZod = z.object({
    product_id: z.number({
        required_error: "must have required property 'product_id'",
        invalid_type_error: "property 'product_id' must be an integer",
    }).int(),
    quantity: z.number({
        required_error: "must have required property 'quantity'",
        invalid_type_error: "property 'quantity' must be an integer",
    }).int(),
    discount: z.number({
        invalid_type_error: "property 'quantity' must be an integer",
    }).optional()
}).array().nonempty("property 'items' must not be empty");

export const createOrderZod = z.object({
    id: z.number({
        invalid_type_error: "property 'id' must be an integer",
    }).int().optional(),
    customer_id: z.number({
        required_error: "must have required property 'customer_id'",
        invalid_type_error: "property 'customer_id' must be integer",
    }).int(),
    items: orderItemsZod
});

export type OrderItemsReplyType = z.infer<typeof orderItemsZod>;
export type CreateOrderRequestType = z.infer<typeof createOrderZod>;