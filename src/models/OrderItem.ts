import { Model } from 'objection';
import Order from './Order';
import Product from './Product';

class OrderItem extends Model {
  static tableName = 'orders_items';

  id!: number;
  order_id!: number;
  product_id!: number;
  quantity!: number;
  tax!: number;
  shipping!: number;
  discount!: number;
  paid!: number;
  created_at?: string;
  updated_at?: string;

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['order_id', 'product_id', 'quantity', 'tax', 'shipping', 'discount', 'paid'],
      properties: {
        id: { type: 'integer' },
        order_id: { type: 'integer' },
        product_id: { type: 'integer' },
        quantity: { type: 'integer', minimum: 1 },
        tax: { type: 'number', minimum: 0 },
        shipping: { type: 'number', minimum: 0 },
        discount: { type: 'number', minimum: 0 },
        paid: { type: 'number', minimum: 0 },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
      },
    };
  }

  static get relationMappings() {
    return {
      order: {
        relation: Model.BelongsToOneRelation,
        modelClass: Order,
        join: {
          from: 'orders_items.order_id',
          to: 'orders.id',
        }
      },
      product: {
        relation: Model.BelongsToOneRelation,
        modelClass: Product,
        join: {

          from: 'orders_items.product_id',
          to: 'products.id',
        }
      }
    };
  }
}

export default OrderItem;
