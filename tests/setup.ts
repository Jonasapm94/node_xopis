import knex from 'src/db';
import { clean } from 'knex-cleaner';

beforeAll(async () => {
  await knex.migrate.latest();
});

beforeEach(async () => {
  await clean(knex);
});

afterAll(async () => {
  await knex.destroy();
});

