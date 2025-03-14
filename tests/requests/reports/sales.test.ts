import 'tests/setup';
import server from 'src/server';
import { faker } from '@faker-js/faker';
import { makeProduct } from 'src/factories/ProductFactory';
import { User, Product, OrderStatus, Order, OrderItem } from 'src/models';
import { makeOrder } from 'src/factories/OrderFactory';
import ProductNotFoundError from 'src/errors/ProductNotFoundError';

describe('SALES report action', () => {
    const today = new Date();
    const yersteday = new Date(`${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate() - 1}`).toISOString();
    const dayAfterTomorrow = new Date(`${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate() + 2}`).toISOString();

    const validQueryParamsWithoutProductId = `start_date=${yersteday}&end_date=${dayAfterTomorrow}`;
    const NUMBER_OF_PRODUCTS = 4;

    let orders: Array<Order>;
    beforeEach(async () => {
        await User.query().insert({
            name: 'John Doe',
            email: 'john.doe@email.com'
        });

        for (let i = 0; i < NUMBER_OF_PRODUCTS; i++) {
            const product = makeProduct({
                name: faker.string.sample(),
                description: faker.lorem.sentence(),
                price: faker.number.float({ min: 10.00, max: 100.00, fractionDigits: 2 }),
                stock: faker.number.int({ min: 10, max: 100 }),
                sku: faker.string.sample(),
            });

            await Product.query().insert(product);
        }

        const createdOrders: Array<Order> = [];
        for (let i = 0; i < 6; i++) {
            const items = faker.helpers.multiple(() => {
                return {
                    product_id: faker.number.int({ min: 1, max: 4 }),
                    quantity: faker.number.int({ min: 1, max: 5 }),
                    discount: faker.number.float({ min: 0, max: 5, fractionDigits: 2 })
                };
            }, {
                count: { min: 1, max: 5 }
            });

            const order = makeOrder({
                customer_id: 1,
                total_paid: 0,
                total_tax: 0,
                total_shipping: 0,
                total_discount: items.reduce((acc, item) => {
                    acc += item.discount || 0;
                    return acc;
                }, 0),
                status: OrderStatus.PaymentPending
            });

            await Order.transaction(async trx => {
                order.items = await Promise.all(items.map(async item => {
                    const discount = item.discount || 0;

                    const product = await Product.query(trx).findById(item.product_id);
                    if (!product) throw new ProductNotFoundError;

                    const paid = (product.price * item.quantity) - discount;

                    const orderItem = new OrderItem();
                    orderItem.product_id = product.id;
                    orderItem.quantity = item.quantity;

                    // they are set to 0 for business logic purposes
                    orderItem.tax = 0;
                    orderItem.shipping = 0;

                    orderItem.discount = item.discount || 0;
                    orderItem.paid = paid;

                    order.total_paid += paid;

                    return orderItem;
                }));

                await Order.query(trx).insertGraph(order);
                createdOrders.push(order);
            });
        }

        orders = createdOrders;
    });

    describe('when the params input is valid', () => {
        it('is successfull', async () => {
            const response = await server.inject({
                url: `/reports/sales?${validQueryParamsWithoutProductId}`
            });

            expect(response.statusCode).toBe(200);
        });

        it('returns the report', async () => {
            const response = await server.inject({
                url: `/reports/sales?${validQueryParamsWithoutProductId}`
            });

            const jsonResponse = await response.json();

            expect(jsonResponse).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        date: expect.any(String),
                        product_id: expect.any(Number),
                        total_sold: expect.any(Number)
                    })
                ])
            );
        });

        it('array returned has as length the same number of products in the given period', async () => {
            const response = await server.inject({
                url: `/reports/sales?${validQueryParamsWithoutProductId}`
            });

            const jsonResponse = await response.json();

            expect(jsonResponse.length).toBe(NUMBER_OF_PRODUCTS);
        });

        it('filter out orders outside the given period', async () => {
            const responseBeforeNewOrder = await server.inject({
                url: `/reports/sales?${validQueryParamsWithoutProductId}`
            });

            const firstJsonResponse = await responseBeforeNewOrder.json();

            const items = faker.helpers.multiple(() => {
                return {
                    product_id: faker.number.int({ min: 1, max: 4 }),
                    quantity: faker.number.int({ min: 1, max: 5 }),
                    discount: faker.number.float({ min: 0, max: 5, fractionDigits: 2 })
                };
            }, {
                count: { min: 1, max: 5 }
            });

            const order = makeOrder({
                customer_id: 1,
                total_paid: 0,
                total_tax: 0,
                total_shipping: 0,
                total_discount: items.reduce((acc, item) => {
                    acc += item.discount || 0;
                    return acc;
                }, 0),
                status: OrderStatus.PaymentPending
            });

            await Order.transaction(async trx => {
                order.items = await Promise.all(items.map(async item => {
                    const discount = item.discount || 0;

                    const product = await Product.query(trx).findById(item.product_id);
                    if (!product) throw new ProductNotFoundError;

                    const paid = (product.price * item.quantity) - discount;

                    const orderItem = new OrderItem();
                    orderItem.product_id = product.id;
                    orderItem.quantity = item.quantity;

                    // they are set to 0 for business logic purposes
                    orderItem.tax = 0;
                    orderItem.shipping = 0;

                    orderItem.discount = item.discount || 0;
                    orderItem.paid = paid;

                    order.total_paid += paid;

                    return orderItem;
                }));

                const createdOrder = await Order.query(trx).insertGraph(order);
                await Promise.all(createdOrder.items!.map(async item => {
                    await item.$query(trx).patch({ created_at: '2025-03-09 12:00:00' });
                }));
                await createdOrder.$query(trx).patch({ created_at: '2025-03-09 12:00:00' });
            });

            const responseAfterNewOrder = await server.inject({
                url: `/reports/sales?${validQueryParamsWithoutProductId}`
            });

            const lastJsonResponse = await responseAfterNewOrder.json();

            expect(lastJsonResponse).toStrictEqual(firstJsonResponse);
        });

        describe('total_sold logic', () => {
            describe('when in the same day, there is more than one order for the same product', () => {
                it('returns in total_order the sum of what was paid in all orders', async () => {
                    const totalPaidByProductMap: Map<number, number> = new Map();

                    orders.forEach(order => {
                        order.items!.forEach(item => {
                            if (totalPaidByProductMap.has(item.product_id)) {
                                totalPaidByProductMap.set(item.product_id, totalPaidByProductMap.get(item.product_id)! + item.paid);
                            } else {
                                totalPaidByProductMap.set(item.product_id, item.paid);
                            }
                        });
                    });

                    const response = await server.inject({
                        url: `/reports/sales?${validQueryParamsWithoutProductId}`
                    });

                    const jsonResponse = await response.json();

                    expect(jsonResponse).toEqual(
                        expect.arrayContaining([
                            expect.objectContaining({
                                date: expect.any(String),
                                product_id: (expect.any(Number)),
                                total_sold: expect.any(Number)
                            })
                        ])
                    );

                    (jsonResponse as Array<{
                        date: Date,
                        product_id: number,
                        total_sold: number
                    }>).forEach(obj => {
                        expect(obj.total_sold).toBe(totalPaidByProductMap.get(obj.product_id));
                    });
                });
            });
        });

        describe('when the product_id is sent', () => {
            const validQueryParamsWithProductId = validQueryParamsWithoutProductId.concat('&product_id=1');

            it('is successfull', async () => {
                const response = await server.inject({
                    url: `/reports/sales?${validQueryParamsWithProductId}`
                });

                expect(response.statusCode).toBe(200);
            });

            it('returns the report', async () => {
                const response = await server.inject({
                    url: `/reports/sales?${validQueryParamsWithProductId}`
                });

                const jsonResponse = await response.json();

                expect(jsonResponse).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({
                            date: expect.any(String),
                            product_id: expect.any(Number),
                            total_sold: expect.any(Number)
                        })
                    ])
                );
            });

            it('array returned will have length equal the number of days with any sale for the given product', async () => {
                const product_id = 1;
                const queryParams = validQueryParamsWithoutProductId.concat(`&product_id=${product_id}`);
                const response = await server.inject({
                    url: `/reports/sales?${queryParams}`
                });

                const numberOfDays = await OrderItem
                    .query()
                    .whereBetween('created_at', [yersteday, dayAfterTomorrow])
                    .andWhere('product_id', product_id)
                    .count('paid')
                    .groupBy('created_at')
                    .resultSize();

                const jsonResponse = await response.json();

                expect(jsonResponse.length).toBe(numberOfDays);
            });

            it('filter out orders outside the given period', async () => {
                const responseBeforeNewOrder = await server.inject({
                    url: `/reports/sales?${validQueryParamsWithProductId}`
                });

                const firstJsonResponse = await responseBeforeNewOrder.json();

                const items = faker.helpers.multiple(() => {
                    return {
                        product_id: faker.number.int({ min: 1, max: 4 }),
                        quantity: faker.number.int({ min: 1, max: 5 }),
                        discount: faker.number.float({ min: 0, max: 5, fractionDigits: 2 })
                    };
                }, {
                    count: { min: 1, max: 5 }
                });

                const order = makeOrder({
                    customer_id: 1,
                    total_paid: 0,
                    total_tax: 0,
                    total_shipping: 0,
                    total_discount: items.reduce((acc, item) => {
                        acc += item.discount || 0;
                        return acc;
                    }, 0),
                    status: OrderStatus.PaymentPending
                });

                await Order.transaction(async trx => {
                    order.items = await Promise.all(items.map(async item => {
                        const discount = item.discount || 0;

                        const product = await Product.query(trx).findById(item.product_id);
                        if (!product) throw new ProductNotFoundError;

                        const paid = (product.price * item.quantity) - discount;

                        const orderItem = new OrderItem();
                        orderItem.product_id = product.id;
                        orderItem.quantity = item.quantity;

                        // they are set to 0 for business logic purposes
                        orderItem.tax = 0;
                        orderItem.shipping = 0;

                        orderItem.discount = item.discount || 0;
                        orderItem.paid = paid;

                        order.total_paid += paid;

                        return orderItem;
                    }));

                    const createdOrder = await Order.query(trx).insertGraph(order);
                    await Promise.all(createdOrder.items!.map(async item => {
                        await item.$query(trx).patch({ created_at: '2025-03-09 12:00:00' });
                    }));
                    await createdOrder.$query(trx).patch({ created_at: '2025-03-09 12:00:00' });
                });

                const responseAfterNewOrder = await server.inject({
                    url: `/reports/sales?${validQueryParamsWithProductId}`
                });

                const lastJsonResponse = await responseAfterNewOrder.json();

                expect(lastJsonResponse).toStrictEqual(firstJsonResponse);
            });

            it('is successfull', async () => {
                const response = await server.inject({
                    url: `/reports/sales?${validQueryParamsWithProductId}`
                });

                expect(response.statusCode).toBe(200);
            });

            it('only shows objects with the product_id sent', async () => {
                const product_id = 1;
                const queryParams = validQueryParamsWithoutProductId.concat(`&product_id=${product_id}`);
                const response = await server.inject({
                    url: `/reports/sales?${queryParams}`
                });

                const jsonResponse = response.json();

                expect(jsonResponse).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({
                            date: expect.any(String),
                            product_id: product_id,
                            total_sold: expect.any(Number)
                        })
                    ])
                );
            });

            describe('total_sold logic', () => {
                describe('when in the same day, there is more than one order for the same product', () => {
                    it('returns in total_order the sum of what was paid in all orders', async () => {
                        const totalPaidByProductMap: Map<number, number> = new Map();

                        orders.forEach(order => {
                            order.items!.forEach(item => {
                                if (totalPaidByProductMap.has(item.product_id)) {
                                    totalPaidByProductMap.set(item.product_id, totalPaidByProductMap.get(item.product_id)! + item.paid);
                                } else {
                                    totalPaidByProductMap.set(item.product_id, item.paid);
                                }
                            });
                        });

                        const response = await server.inject({
                            url: `/reports/sales?${validQueryParamsWithProductId}`
                        });

                        const jsonResponse = await response.json();

                        expect(jsonResponse).toEqual(
                            expect.arrayContaining([
                                expect.objectContaining({
                                    date: expect.any(String),
                                    product_id: (expect.any(Number)),
                                    total_sold: expect.any(Number)
                                })
                            ])
                        );

                        (jsonResponse as Array<{
                            date: Date,
                            product_id: number,
                            total_sold: number
                        }>).forEach(obj => {
                            expect(obj.total_sold).toBe(totalPaidByProductMap.get(obj.product_id));
                        });
                    });
                });
            });
        });
    });

    describe('params validations', () => {
        describe('start_date', () => {
            describe('when start_date is missing', () => {
                it('returns bad request response', async () => {
                    const queryParamWithoutStartDate = `end_date=${dayAfterTomorrow}&product_id=1`;
                    const response = await server.inject({
                        url: `/reports/sales?${queryParamWithoutStartDate}`
                    });

                    const jsonResponse = await response.json();

                    expect(response.statusCode).toBe(400);
                    expect(jsonResponse.message).toBe('querystring/start_date is required');
                });
            });
        });

        describe('end_date', () => {
            describe('when end_date is missing', () => {
                it('returns bad request response', async () => {
                    const queryParamWithoutEndDate = `start_date=${yersteday}&product_id=1`;
                    const response = await server.inject({
                        url: `/reports/sales?${queryParamWithoutEndDate}`
                    });

                    const jsonResponse = await response.json();

                    expect(response.statusCode).toBe(400);
                    expect(jsonResponse.message).toBe('querystring/end_date is required');
                });
            });
        });

        describe('product_id', () => {
            describe('when product_id is missing', () => {
                it('is successfull (product_id is optional)', async () => {
                    const response = await server.inject({
                        url: `/reports/sales?${validQueryParamsWithoutProductId}`
                    });

                    expect(response.statusCode).toBe(200);
                });

                it('returns the report', async () => {
                    const response = await server.inject({
                        url: `/reports/sales?${validQueryParamsWithoutProductId}`
                    });

                    const jsonResponse = await response.json();

                    expect(jsonResponse).toEqual(
                        expect.arrayContaining([
                            expect.objectContaining({
                                date: expect.any(String),
                                product_id: expect.any(Number),
                                total_sold: expect.any(Number)
                            })
                        ])
                    );
                });

                it('array returned has as length the same number of products in the given period', async () => {
                    const response = await server.inject({
                        url: `/reports/sales?${validQueryParamsWithoutProductId}`
                    });

                    const jsonResponse = await response.json();

                    expect(jsonResponse.length).toBe(NUMBER_OF_PRODUCTS);
                });

                it('filter out orders outside the given period', async () => {
                    const items = faker.helpers.multiple(() => {
                        return {
                            product_id: faker.number.int({ min: 1, max: 4 }),
                            quantity: faker.number.int({ min: 1, max: 5 }),
                            discount: faker.number.float({ min: 0, max: 5, fractionDigits: 2 })
                        };
                    }, {
                        count: { min: 1, max: 5 }
                    });

                    const order = makeOrder({
                        customer_id: 1,
                        total_paid: 0,
                        total_tax: 0,
                        total_shipping: 0,
                        total_discount: items.reduce((acc, item) => {
                            acc += item.discount || 0;
                            return acc;
                        }, 0),
                        status: OrderStatus.PaymentPending
                    });

                    await Order.transaction(async trx => {
                        order.items = await Promise.all(items.map(async item => {
                            const discount = item.discount || 0;

                            const product = await Product.query(trx).findById(item.product_id);
                            if (!product) throw new ProductNotFoundError;

                            const paid = (product.price * item.quantity) - discount;

                            const orderItem = new OrderItem();
                            orderItem.product_id = product.id;
                            orderItem.quantity = item.quantity;

                            // they are set to 0 for business logic purposes
                            orderItem.tax = 0;
                            orderItem.shipping = 0;

                            orderItem.discount = item.discount || 0;
                            orderItem.paid = paid;

                            order.total_paid += paid;

                            return orderItem;
                        }));

                        await Order.query(trx).insertGraph(order);
                    });

                    const response = await server.inject({
                        url: `/reports/sales?${validQueryParamsWithoutProductId}`
                    });

                    const jsonResponse = await response.json();

                    expect(jsonResponse.length).toBe(NUMBER_OF_PRODUCTS);
                });
            });
        });

        describe('date interval logic', () => {
            describe('start_date must be equal or less then end_date', () => {
                it('returns bad request response', async () => {
                    const queryParamWithoutEndDate = `start_date=${dayAfterTomorrow}&end_date=${yersteday}&product_id=1`;
                    const response = await server.inject({
                        url: `/reports/sales?${queryParamWithoutEndDate}`
                    });

                    const jsonResponse = await response.json();

                    expect(response.statusCode).toBe(422);
                    expect(jsonResponse.message).toBe("Query param 'end_date' must be greater than or equal to 'start_date'");
                });
            });
        });
    });
});