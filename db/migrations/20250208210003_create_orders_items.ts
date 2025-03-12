import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('orders_items', (table) => {
    table.increments('id').primary();
    table.integer('order_id').notNullable().references('id').inTable('orders');
    table.integer('product_id').notNullable().references('id').inTable('products');
    table.integer('quantity').notNullable();
    table.float('tax').notNullable();
    table.float('shipping').notNullable();
    table.float('discount').notNullable();
    table.float('paid').notNullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('orders_items');
}
