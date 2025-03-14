import { FastifyInstance } from 'fastify';
import salesReport from '../actions/reports/sales';
import { salesReportZod } from '../validations/salesReport.zod';

export default async function reportRoutes(server: FastifyInstance) {
  server.get('/sales', {
    schema: {
      querystring: salesReportZod
    }
  }, salesReport);
}
