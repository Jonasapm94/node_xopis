import fastify from 'fastify';
import userRoutes from './routes/users';
import productRoutes from './routes/products';
import ordersRoutes from './routes/orders';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import reportRoutes from './routes/reports';

const shouldLog = process.env.NODE_ENV !== 'test';
const server = fastify({ logger: shouldLog });

server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

server.register(userRoutes, { prefix: '/users' });
server.register(productRoutes, { prefix: '/products' });
server.register(ordersRoutes, { prefix: '/orders' });
server.register(reportRoutes, { prefix: '/reports' });

export default server;
