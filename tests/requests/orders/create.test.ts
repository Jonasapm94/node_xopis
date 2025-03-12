import 'tests/setup';
import server from 'src/server';
import User from 'src/models/User';
import Order, { OrderStatus } from 'src/models/Order';
import { faker } from '@faker-js/faker';
import { Product } from 'src/models';

describe('CREATE action', () => {
  const validInput = {
    customer_id: 1,
    items: [
      {
        product_id: 1,
        quantity: 2,
        discount: 3.98
      },
      {
        product_id: 2,
        quantity: 1,
        discount: 0.99
      }
    ]
  };

  describe('when the input is valid', () => {
    beforeEach(async () => {
      await User.query().insert({
        name: 'John Doe',
        email: 'john.doe@email.com'
      });

      for (let i = 0; i < 2; i++) {
        const product = new Product();
        product.name = faker.string.sample();
        product.description = faker.lorem.sentence();
        product.price = faker.number.float({ min: 10.00, max: 100.00 });
        product.stock = faker.number.int({ min: 10, max: 100 });
        product.sku = faker.string.sample();

        await Product.query().insert(product);
      }
    });

    const input = validInput;

    it('is successful', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/orders',
        body: input
      });

      expect(response.statusCode).toBe(201);
    });

    it('creates a new record', async () => {
      const initialCount = await Order.query().where('customer_id', validInput.customer_id).resultSize();

      await server.inject({
        method: 'POST',
        url: '/orders',
        body: input
      });

      const finalCount = await Order.query().where('customer_id', validInput.customer_id).resultSize();

      expect(finalCount).toBe(initialCount + 1);
    });

    it('returns the created order', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/orders',
        body: input
      });

      const jsonResponse = await response.json();

      const expectedTotalDiscount = input.items.reduce((acc, item) => {
        return acc += item.discount;
      }, 0);

      expect(Object.values(OrderStatus)).toContain(jsonResponse.status);
      expect(jsonResponse).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          customer_id: input.customer_id,
          total_paid: expect.any(Number),
          total_discount: expectedTotalDiscount,
          status: expect.any(String),
          items: expect.arrayContaining([
            expect.objectContaining({
              product_id: expect.any(Number),
              quantity: expect.any(Number),
              discount: expect.any(Number)
            })
          ])
        })
      );
      expect(jsonResponse.items.length).toBe(input.items.length);
    });

    it('total_paid should be equal to the total sum of (item price * quantity) minus discount', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/orders',
        body: input
      });

      const jsonResponse = await response.json();

      const totalPaidByItemArray = await Promise.all(input.items.map(async item => {
        const discount = item.discount || 0;
        const product = await Product.query().findById(item.product_id);
        return (product!.price * item.quantity) - discount;
      }));

      const expectedTotalPaid = totalPaidByItemArray.reduce((acc, paid) => acc += paid);

      expect(jsonResponse.total_paid).toBe(expectedTotalPaid);
    });
  });

  describe('customer_id validations', () => {
    describe('when the customer_id is missing', () => {
      const { customer_id, ...input } = validInput;

      it('does not create a new record', async () => {

        const initialCount = await Order.query().where('customer_id', customer_id).resultSize();

        await server.inject({
          method: 'POST',
          url: '/orders',
          body: input,
        });

        const finalCount = await Order.query().where('customer_id', customer_id).resultSize();

        expect(finalCount).toBe(initialCount);
      });

      it('returns a bad request response', async () => {
        const response = await server.inject({
          method: 'POST',
          url: '/orders',
          body: input,
        });

        const jsonResponse = response.json<{ message: string }>();
        expect(response.statusCode).toBe(400);
        expect(jsonResponse.message).toMatch("must have required property 'customer_id'");
      });
    });

    describe('when the customer_id is string', () => {
      const inputWithCustomerIdString = {
        ...validInput,
        customer_id: faker.string.sample()
      };

      it('does not create a new record', async () => {

        const initialCount = await Order.query().where('customer_id', validInput.customer_id).resultSize();

        await server.inject({
          method: 'POST',
          url: '/orders',
          body: inputWithCustomerIdString,
        });

        const finalCount = await Order.query().where('customer_id', validInput.customer_id).resultSize();

        expect(finalCount).toBe(initialCount);
      });

      it('returns a bad request response', async () => {
        const response = await server.inject({
          method: 'POST',
          url: '/orders',
          body: inputWithCustomerIdString,
        });

        const jsonResponse = response.json<{ message: string }>();
        expect(response.statusCode).toBe(400);
        expect(jsonResponse.message).toMatch("property 'customer_id' must be integer");
      });
    });
  });

  describe('items validations', () => {
    describe('when the items are missing', () => {
      const { items, ...input } = validInput;

      it('does not create a new record', async () => {

        const initialCount = await Order.query().where('customer_id', validInput.customer_id).resultSize();

        await server.inject({
          method: 'POST',
          url: '/orders',
          body: input,
        });

        const finalCount = await Order.query().where('customer_id', validInput.customer_id).resultSize();

        expect(finalCount).toBe(initialCount);
      });

      it('returns a bad request response', async () => {
        const response = await server.inject({
          method: 'POST',
          url: '/orders',
          body: input,
        });

        const jsonResponse = response.json<{ message: string }>();
        expect(response.statusCode).toBe(400);
        expect(jsonResponse.message).toMatch('body/items Required');
      });
    });

    describe('when items property is string', () => {
      const inputWithItemsAsString = {
        ...validInput,
        items: faker.string.sample()
      };

      it('does not create a new record', async () => {

        const initialCount = await Order.query().where('customer_id', validInput.customer_id).resultSize();

        await server.inject({
          method: 'POST',
          url: '/orders',
          body: inputWithItemsAsString,
        });

        const finalCount = await Order.query().where('customer_id', validInput.customer_id).resultSize();

        expect(finalCount).toBe(initialCount);
      });

      it('returns a bad request response', async () => {
        const response = await server.inject({
          method: 'POST',
          url: '/orders',
          body: inputWithItemsAsString,
        });

        const jsonResponse = response.json<{ message: string }>();
        expect(response.statusCode).toBe(400);
        expect(jsonResponse.message).toMatch('body/items Expected array, received string');
      });
    });

    describe('when items property is an object', () => {
      const inputWithItemsAsObject = {
        ...validInput,
        items: {}
      };

      it('does not create a new record', async () => {

        const initialCount = await Order.query().where('customer_id', validInput.customer_id).resultSize();

        await server.inject({
          method: 'POST',
          url: '/orders',
          body: inputWithItemsAsObject,
        });

        const finalCount = await Order.query().where('customer_id', validInput.customer_id).resultSize();

        expect(finalCount).toBe(initialCount);
      });

      it('returns a bad request response', async () => {
        const response = await server.inject({
          method: 'POST',
          url: '/orders',
          body: inputWithItemsAsObject,
        });

        const jsonResponse = response.json<{ message: string }>();
        expect(response.statusCode).toBe(400);
        expect(jsonResponse.message).toMatch('body/items Expected array, received object');
      });
    });

    describe('when items property is an empty array', () => {
      const inputWithEmptyItems = {
        ...validInput,
        items: []
      };

      it('does not create a new record', async () => {

        const initialCount = await Order.query().where('customer_id', validInput.customer_id).resultSize();

        await server.inject({
          method: 'POST',
          url: '/orders',
          body: inputWithEmptyItems,
        });

        const finalCount = await Order.query().where('customer_id', validInput.customer_id).resultSize();

        expect(finalCount).toBe(initialCount);
      });

      it('returns a bad request response', async () => {
        const response = await server.inject({
          method: 'POST',
          url: '/orders',
          body: inputWithEmptyItems,
        });

        const jsonResponse = response.json<{ message: string }>();
        expect(response.statusCode).toBe(400);
        expect(jsonResponse.message).toMatch("property 'items' must not be empty");
      });
    });

    describe('items objects validations', () => {
      describe('product_id', () => {
        describe('when product_id does not match any register in the database', () => {
          const inputWithGenericProductIddOfItem = {
            ...validInput,
            items: [
              {
                product_id: faker.number.int(),
                quantity: faker.number.int(),
                discount: faker.number.float()
              }
            ]
          };

          it('does not create a new record', async () => {

            const initialCount = await Order.query().where('customer_id', validInput.customer_id).resultSize();

            await server.inject({
              method: 'POST',
              url: '/orders',
              body: inputWithGenericProductIddOfItem,
            });

            const finalCount = await Order.query().where('customer_id', validInput.customer_id).resultSize();

            expect(finalCount).toBe(initialCount);
          });

          it('returns a bad request response', async () => {
            const response = await server.inject({
              method: 'POST',
              url: '/orders',
              body: inputWithGenericProductIddOfItem,
            });

            const jsonResponse = response.json<{ message: string }>();
            expect(response.statusCode).toBe(400);
            expect(jsonResponse.message).toMatch('Product not found.');
          });
        });

        describe('when product_id is missing', () => {
          const inputWithProductIdOfItemMissing = {
            ...validInput,
            items: [
              {
                quantity: faker.number.int(),
                discount: faker.number.float()
              }
            ]
          };

          it('does not create a new record', async () => {

            const initialCount = await Order.query().where('customer_id', validInput.customer_id).resultSize();

            await server.inject({
              method: 'POST',
              url: '/orders',
              body: inputWithProductIdOfItemMissing,
            });

            const finalCount = await Order.query().where('customer_id', validInput.customer_id).resultSize();

            expect(finalCount).toBe(initialCount);
          });

          it('returns a bad request response', async () => {
            const response = await server.inject({
              method: 'POST',
              url: '/orders',
              body: inputWithProductIdOfItemMissing,
            });

            const jsonResponse = response.json<{ message: string }>();
            expect(response.statusCode).toBe(400);
            expect(jsonResponse.message).toMatch("must have required property 'product_id'");
          });
        });

        describe('when product_id is string', () => {
          const inputWithProductIdOfItemAsString = {
            ...validInput,
            items: [
              {
                product_id: faker.string.sample(),
                quantity: faker.number.int(),
                discount: faker.number.float()
              }
            ]
          };

          it('does not create a new record', async () => {

            const initialCount = await Order.query().where('customer_id', validInput.customer_id).resultSize();

            await server.inject({
              method: 'POST',
              url: '/orders',
              body: inputWithProductIdOfItemAsString,
            });

            const finalCount = await Order.query().where('customer_id', validInput.customer_id).resultSize();

            expect(finalCount).toBe(initialCount);
          });

          it('returns a bad request response', async () => {
            const response = await server.inject({
              method: 'POST',
              url: '/orders',
              body: inputWithProductIdOfItemAsString,
            });

            const jsonResponse = response.json<{ message: string }>();
            expect(response.statusCode).toBe(400);
            expect(jsonResponse.message).toMatch("property 'product_id' must be an integer");
          });
        });
      });

      describe('quantity', () => {
        describe('when quantity is missing', () => {
          const inputWithQuantityOfItemMissing = {
            ...validInput,
            items: [
              {
                product_id: faker.number.int(),
              }
            ]
          };

          it('does not create a new record', async () => {

            const initialCount = await Order.query().where('customer_id', validInput.customer_id).resultSize();

            await server.inject({
              method: 'POST',
              url: '/orders',
              body: inputWithQuantityOfItemMissing,
            });

            const finalCount = await Order.query().where('customer_id', validInput.customer_id).resultSize();

            expect(finalCount).toBe(initialCount);
          });

          it('returns a bad request response', async () => {
            const response = await server.inject({
              method: 'POST',
              url: '/orders',
              body: inputWithQuantityOfItemMissing,
            });

            const jsonResponse = response.json<{ message: string }>();
            expect(response.statusCode).toBe(400);
            expect(jsonResponse.message).toMatch("must have required property 'quantity'");
          });
        });

        describe('when quantity is string', () => {
          const inputWithQuantityOfItemAsString = {
            ...validInput,
            items: [
              {
                product_id: faker.number.int(),
                quantity: faker.string.sample(),
                discount: faker.number.float()
              }
            ]
          };

          it('does not create a new record', async () => {

            const initialCount = await Order.query().where('customer_id', validInput.customer_id).resultSize();

            await server.inject({
              method: 'POST',
              url: '/orders',
              body: inputWithQuantityOfItemAsString,
            });

            const finalCount = await Order.query().where('customer_id', validInput.customer_id).resultSize();

            expect(finalCount).toBe(initialCount);
          });

          it('returns a bad request response', async () => {
            const response = await server.inject({
              method: 'POST',
              url: '/orders',
              body: inputWithQuantityOfItemAsString,
            });

            const jsonResponse = response.json<{ message: string }>();
            expect(response.statusCode).toBe(400);
            expect(jsonResponse.message).toMatch("property 'quantity' must be an integer");
          });
        });
      });

      describe('discount', () => {
        describe('when discount is missing', () => {
          beforeEach(async () => {
            const product = new Product();
            product.name = faker.string.sample();
            product.description = faker.lorem.sentence();
            product.price = faker.number.float();
            product.stock = faker.number.int({ min: 10 });
            product.sku = faker.string.sample();

            await Product.query().insert(product);
          });

          const inputWithDiscountOfItemMissing = {
            ...validInput,
            items: [
              {
                product_id: 1,
                quantity: 1,
              }
            ]
          };

          it('does create a new record', async () => {
            const initialCount = await Order.query().where('customer_id', validInput.customer_id).resultSize();

            await server.inject({
              method: 'POST',
              url: '/orders',
              body: inputWithDiscountOfItemMissing,
            });

            const finalCount = await Order.query().where('customer_id', validInput.customer_id).resultSize();

            expect(finalCount).toBe(initialCount + 1);
          });

          it('is successfull', async () => {
            const response = await server.inject({
              method: 'POST',
              url: '/orders',
              body: inputWithDiscountOfItemMissing,
            });

            expect(response.statusCode).toBe(201);
          });
        });

        describe('when discount is string', () => {
          const inputWithDiscountOfItemAsString = {
            ...validInput,
            items: [
              {
                product_id: faker.number.int(),
                quantity: faker.number.int(),
                discount: faker.string.sample(),
              }
            ]
          };

          it('does not create a new record', async () => {

            const initialCount = await Order.query().where('customer_id', validInput.customer_id).resultSize();

            await server.inject({
              method: 'POST',
              url: '/orders',
              body: inputWithDiscountOfItemAsString,
            });

            const finalCount = await Order.query().where('customer_id', validInput.customer_id).resultSize();

            expect(finalCount).toBe(initialCount);
          });

          it('returns a bad request response', async () => {
            const response = await server.inject({
              method: 'POST',
              url: '/orders',
              body: inputWithDiscountOfItemAsString,
            });

            const jsonResponse = response.json<{ message: string }>();
            expect(response.statusCode).toBe(400);
            expect(jsonResponse.message).toMatch("property 'quantity' must be an integer");
          });
        });
      });
    });
  });
});
