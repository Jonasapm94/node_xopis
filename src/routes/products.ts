import { FastifyInstance } from 'fastify';
import productCreate from '../actions/products/create';
import productsList from '../actions/products/list';
import productFetch from '../actions/products/fetch';
import productDelete from '../actions/products/delete';
import productUpdate from '../actions/products/update';

export default async function productRoutes(server: FastifyInstance) {
  server.post('/', productCreate);
  server.get('/', productsList);
  server.get('/:id', productFetch);
  server.delete('/:id', productDelete);
  server.patch('/:id', productUpdate);
}
