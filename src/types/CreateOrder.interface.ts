export interface CreateOrder {
    customer_id: number,
    items: Array<OrderItemDTO>
}

export interface OrderItemDTO {
    product_id: number,
    quantity: number,
    discount?: number
}