import { Model } from 'objection';
import User from './User';
import OrderItem from './OrderItem';
import Product from './Product';
import Payment from './Payment';

export enum OrderStatus {
  PaymentPending = 'payment_pending',
  FraudReview = 'fraud_review',
  Approved = 'approved',
  Shipped = 'shipped',
  Delivered = 'delivered',
  CustomerCanceled = 'customer_canceled',
  AdminCanceled = 'admin_canceled',
  FraudCanceled = 'fraud_canceled',
}

class Order extends Model {
  static tableName = 'orders';

  id!: number;
  customer_id!: number;
  total_paid!: number;
  total_tax!: number;
  total_shipping!: number;
  total_discount!: number;
  status!: OrderStatus;
  created_at?: string;
  updated_at?: string;
  items?: Array<OrderItem>;

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['customer_id', 'total_paid', 'total_tax', 'total_shipping', 'total_discount', 'status'],
      properties: {
        id: { type: 'integer' },
        customer_id: { type: 'integer' },
        total_paid: { type: 'number', minimum: 0 },
        total_tax: { type: 'number', minimum: 0 },
        total_shipping: { type: 'number', minimum: 0 },
        total_discount: { type: 'number', minimum: 0 },
        status: { type: 'string', enum: Object.values(OrderStatus) },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
      },
    };
  }

  static get relationMappings() {
    return {
      customer: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'orders.customer_id',
          to: 'users.id',
        }
      },
      items: {
        relation: Model.HasManyRelation,
        modelClass: OrderItem,
        join: {
          from: 'orders.id',
          to: 'orders_items.order_id',
        }
      },
      products: {
        relation: Model.ManyToManyRelation,
        modelClass: Product,
        join: {
          from: 'orders.id',
          through: {
            from: 'orders_items.order_id',
            to: 'orders_items.product_id',
          },
          to: 'products.id',
        }
      },
      payment: {
        relation: Model.HasOneRelation,
        modelClass: Payment,
        join: {
          from: 'orders.id',
          to: 'payments.order_id',
        }
      }
    };
  }
}

export default Order;
