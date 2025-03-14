import { FastifyInstance } from 'fastify';
import salesReport from '../actions/reports/sales';
import topProductsReport from '../actions/reports/topProducts';
import { salesReportZod } from '../validations/salesReport.zod';
import { topProductsReportZod } from '../validations/topProductsReport.zod';

export default async function reportRoutes(server: FastifyInstance) {
  server.get('/sales', {
    schema: {
      querystring: salesReportZod
    }
  }, salesReport);

  server.get('/top-products', {
    schema: {
      querystring: topProductsReportZod
    }
  }, topProductsReport);
}
