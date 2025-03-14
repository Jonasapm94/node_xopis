import { FastifyRequest, FastifyReply } from 'fastify';
import DateIntervalError from '../../errors/DateIntervalError';
import { TopProductsReportZodType } from '../../validations/topProductsReport.zod';
import knex from '../../db';
import { BreakdownNotBooleanError } from '../../errors/BreakdownNotBooleanError';

function castBreakdownToBoolean(breakdown: string) {
    if (breakdown === 'true') {
        return true;
    }

    if (breakdown === 'false') {
        return false;
    }

    throw new BreakdownNotBooleanError();
}

export default async (
    request: FastifyRequest<{ Querystring: TopProductsReportZodType }>,
    reply: FastifyReply
) => {
    const { start_date, end_date, breakdown } = request.query;
    try {

        const breakdownBoolean: boolean = breakdown ? castBreakdownToBoolean(breakdown) : false;
        const start_dateIsoString = new Date(start_date).toISOString();
        const end_dateIsoString = new Date(end_date).toISOString();
        if (start_dateIsoString > end_dateIsoString) throw new DateIntervalError();

        let response: Array<TopProductsResponseInnerObjectWithoutDate | TopProductsResponseInnerObject>;

        if (breakdownBoolean) {
            response = await knex
                .select('product_id', 'created_at as date')
                .from('orders_items')
                .whereBetween('created_at', [start_dateIsoString, end_dateIsoString])
                .count('order_id as total_purchases')
                .groupBy('date', 'product_id')
                .orderBy('product_id')
                .debug(true)
                .then((queryResponse: Array<{
                    product_id: number,
                    date: string,
                    total_purchases: number
                }>) => {
                    const report: Array<TopProductsResponseInnerObject> = [];
                    const dateAggregateMap: Map<string, Map<number, number>> = new Map();

                    queryResponse.forEach(r => {
                        r.date = r.date.split(' ')[0];
                        if (dateAggregateMap.has(r.date)) {
                            const productTotalPurchasesMap = dateAggregateMap.get(r.date)!;
                            if (productTotalPurchasesMap.has(r.product_id)) {
                                productTotalPurchasesMap.set(
                                    r.product_id,
                                    productTotalPurchasesMap.get(r.product_id)! + r.total_purchases
                                );
                            } else {
                                productTotalPurchasesMap.set(r.product_id, r.total_purchases);
                            }
                        } else {
                            const productTotalPurchasesMap: Map<number, number> = new Map();
                            productTotalPurchasesMap.set(r.product_id, r.total_purchases);
                            dateAggregateMap.set(r.date!, productTotalPurchasesMap);
                        }
                    });

                    dateAggregateMap.forEach((productMap, date) => {
                        productMap.forEach((total_purchases, product_id) => {
                            const obj: TopProductsResponseInnerObject = {
                                product_id,
                                date,
                                total_purchases
                            };
                            report.push(obj);
                        });
                    });

                    return report;
                });
        } else {
            response = await knex
                .select('product_id')
                .from('orders_items')
                .whereBetween('created_at', [start_dateIsoString, end_dateIsoString])
                .count('order_id as total_purchases')
                .groupBy('product_id')
                .orderBy('product_id');
        }

        return reply.status(200).send(response);
    } catch (error) {
        if (error instanceof DateIntervalError) {
            return reply.status(422).send({
                message: "Query param 'end_date' must be greater than or equal to 'start_date'"
            });
        }

        if (error instanceof BreakdownNotBooleanError) {
            return reply.status(400).send({
                message: error.message
            });
        }

        throw error;
    }
};

interface TopProductsResponseInnerObject {
    product_id: number,
    date: string,
    total_purchases: number
}

type TopProductsResponseInnerObjectWithoutDate = Omit<TopProductsResponseInnerObject, 'date'>;
