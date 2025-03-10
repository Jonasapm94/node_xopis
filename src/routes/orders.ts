import { FastifyInstance } from 'fastify';
import orderCreate from '../actions/orders/create';
import { createOrderZod } from '../../src/validations/order.zod';

export default async function ordersRoutes(server: FastifyInstance) {
    server.post('/', {
        schema: {
            body: createOrderZod
        }
    }, orderCreate);
}