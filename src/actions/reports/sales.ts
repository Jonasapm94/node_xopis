import { FastifyRequest, FastifyReply } from 'fastify';
import { SalesReportParamsType } from '../../validations/salesReport.zod';
import DateIntervalError from '../../errors/DateIntervalError';
import OrderItem from '../../models/OrderItem';

export default async (
    request: FastifyRequest<{ Querystring: SalesReportParamsType }>,
    reply: FastifyReply
) => {
    const { start_date, end_date, product_id } = request.query;

    try {
        const start_dateIsoString = new Date(start_date).toISOString();
        const end_dateIsoString = new Date(end_date).toISOString();
        if (start_dateIsoString > end_dateIsoString) throw new DateIntervalError();

        let orderItems: Array<OrderItem> | undefined;
        if (product_id) {
            orderItems = await OrderItem.query().whereBetween('created_at', [start_dateIsoString, end_dateIsoString]).andWhere('product_id', product_id);
        } else {
            orderItems = await OrderItem.query().whereBetween('created_at', [start_dateIsoString, end_dateIsoString]);
        }

        const response: Array<SalesReportInnerObject> = [];

        const dateAggregateMap: Map<string, Map<number, number>> = new Map();

        if (orderItems) {
            orderItems.forEach(orderItem => {
                if (dateAggregateMap.has(orderItem.created_at!)) {
                    const product_PaidMap = dateAggregateMap.get(orderItem.created_at!)!;
                    if (product_PaidMap.has(orderItem.product_id)) {
                        product_PaidMap.set(orderItem.product_id, product_PaidMap.get(orderItem.product_id)! + orderItem.paid);
                    } else {
                        product_PaidMap.set(orderItem.product_id, orderItem.paid);
                    }
                } else {
                    const product_PaidMap: Map<number, number> = new Map();
                    product_PaidMap.set(orderItem.product_id, orderItem.paid);
                    dateAggregateMap.set(orderItem.created_at!, product_PaidMap);
                }
            });

            dateAggregateMap.forEach((productMap, date) => {
                productMap.forEach((total_sold, product_id) => {
                    const obj: SalesReportInnerObject = {
                        date,
                        product_id,
                        total_sold
                    };
                    response.push(obj);
                });
            });
        }

        return reply.status(200).send(response);
    } catch (error) {
        if (error instanceof DateIntervalError) {
            return reply.status(422).send({
                message: "Query param 'end_date' must be greater than or equal to 'start_date'"
            });
        }

        throw error;
    }
};

interface SalesReportInnerObject {
    date: string,
    product_id: number,
    total_sold: number
}
