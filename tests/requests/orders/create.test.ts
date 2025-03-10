import 'tests/setup';
import server from 'src/server';
import User from 'src/models/User';
import Order, { OrderStatus } from 'src/models/Order';
// import { LightMyRequestResponse } from 'fastify';
import { faker } from '@faker-js/faker';

describe('CREATE action', () => {
  const user: Partial<User> = {
    name: 'John Doe',
    email: 'john.doe@email.com'
  };

  beforeAll(async () => {
    const createdUser = await User.query().insert(user);
    user.id = createdUser.id;
  });

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
      const initialCount = await Order.query().where(input).resultSize();

      await server.inject({
        method: 'POST',
        url: '/orders',
        body: input
      });

      const finalCount = await Order.query().where(input).resultSize();

      expect(finalCount).toBe(initialCount + 1);
    });

    it('returns the created order', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/orders',
        body: input
      });

      const jsonResponse = response.json();

      expect(jsonResponse).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          customer_id: input.customer_id,
          total_paid: expect.any(Number),
          total_discount: input.items.reduce((acc, item) => {
            return acc += item.discount;
          }, 0),
          status: expect.any(OrderStatus),
          items: expect.arrayContaining(
            expect.objectContaining({
              product_id: expect.any(Number),
              quantity: expect.any(Number),
              discount: expect.any(Number)
            })
          )
        })
      );
      expect(jsonResponse.items.length).toBe(input.items.length);
    });
  });

  describe('customer_id validations', () => {
    describe('when the customer_id is missing', () => {
      const { customer_id, ...input } = validInput;

      it('does not create a new record', async () => {

        const initialCount = await Order.query().where(input).resultSize();

        await server.inject({
          method: 'POST',
          url: '/orders',
          body: input,
        });

        const finalCount = await Order.query().where(input).resultSize();

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

        const initialCount = await Order.query().where(inputWithCustomerIdString).resultSize();

        await server.inject({
          method: 'POST',
          url: '/orders',
          body: inputWithCustomerIdString,
        });

        const finalCount = await Order.query().where(inputWithCustomerIdString).resultSize();

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
        expect(jsonResponse.message).toMatch("property 'customer_id' must be string");
      });
    });
  });

  describe('items validations', () => {
    describe('when the items are missing', () => {
      const { items, ...input } = validInput;

      it('does not create a new record', async () => {

        const initialCount = await Order.query().where(input).resultSize();

        await server.inject({
          method: 'POST',
          url: '/orders',
          body: input,
        });

        const finalCount = await Order.query().where(input).resultSize();

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
        expect(jsonResponse.message).toMatch("must have required property 'items'");
      });
    });

    describe('when items property is string', () => {
      const inputWithItemsAsString = {
        ...validInput,
        items: faker.string.sample()
      };

      it('does not create a new record', async () => {

        const initialCount = await Order.query().where(inputWithItemsAsString).resultSize();

        await server.inject({
          method: 'POST',
          url: '/orders',
          body: inputWithItemsAsString,
        });

        const finalCount = await Order.query().where(inputWithItemsAsString).resultSize();

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
        expect(jsonResponse.message).toMatch("property 'items' must be an array");
      });
    });

    describe('when items property is an object', () => {
      const inputWithItemsAsObject = {
        ...validInput,
        items: {}
      };

      it('does not create a new record', async () => {

        const initialCount = await Order.query().where(inputWithItemsAsObject).resultSize();

        await server.inject({
          method: 'POST',
          url: '/orders',
          body: inputWithItemsAsObject,
        });

        const finalCount = await Order.query().where(inputWithItemsAsObject).resultSize();

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
        expect(jsonResponse.message).toMatch("property 'items' must be an array");
      });
    });

    describe('when items property is an empty array', () => {
      const inputWithEmptyItems = {
        ...validInput,
        items: []
      };

      it('does not create a new record', async () => {

        const initialCount = await Order.query().where(inputWithEmptyItems).resultSize();

        await server.inject({
          method: 'POST',
          url: '/orders',
          body: inputWithEmptyItems,
        });

        const finalCount = await Order.query().where(inputWithEmptyItems).resultSize();

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

            const initialCount = await Order.query().where(inputWithGenericProductIddOfItem).resultSize();

            await server.inject({
              method: 'POST',
              url: '/orders',
              body: inputWithGenericProductIddOfItem,
            });

            const finalCount = await Order.query().where(inputWithGenericProductIddOfItem).resultSize();

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
            expect(jsonResponse.message).toMatch(`product with product_id ${inputWithGenericProductIddOfItem.items[0].product_id} not found`);
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

            const initialCount = await Order.query().where(inputWithProductIdOfItemMissing).resultSize();

            await server.inject({
              method: 'POST',
              url: '/orders',
              body: inputWithProductIdOfItemMissing,
            });

            const finalCount = await Order.query().where(inputWithProductIdOfItemMissing).resultSize();

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

            const initialCount = await Order.query().where(inputWithProductIdOfItemAsString).resultSize();

            await server.inject({
              method: 'POST',
              url: '/orders',
              body: inputWithProductIdOfItemAsString,
            });

            const finalCount = await Order.query().where(inputWithProductIdOfItemAsString).resultSize();

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

            const initialCount = await Order.query().where(inputWithQuantityOfItemMissing).resultSize();

            await server.inject({
              method: 'POST',
              url: '/orders',
              body: inputWithQuantityOfItemMissing,
            });

            const finalCount = await Order.query().where(inputWithQuantityOfItemMissing).resultSize();

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

            const initialCount = await Order.query().where(inputWithQuantityOfItemAsString).resultSize();

            await server.inject({
              method: 'POST',
              url: '/orders',
              body: inputWithQuantityOfItemAsString,
            });

            const finalCount = await Order.query().where(inputWithQuantityOfItemAsString).resultSize();

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
        describe('when quantity is missing', () => {
          const inputWithDiscountOfItemMissing = {
            ...validInput,
            items: [
              {
                product_id: faker.number.int(),
                quantity: faker.number.int(),
              }
            ]
          };

          it('does create a new record', async () => {
            const initialCount = await Order.query().where(inputWithDiscountOfItemMissing).resultSize();

            await server.inject({
              method: 'POST',
              url: '/orders',
              body: inputWithDiscountOfItemMissing,
            });

            const finalCount = await Order.query().where(inputWithDiscountOfItemMissing).resultSize();

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

            const initialCount = await Order.query().where(inputWithDiscountOfItemAsString).resultSize();

            await server.inject({
              method: 'POST',
              url: '/orders',
              body: inputWithDiscountOfItemAsString,
            });

            const finalCount = await Order.query().where(inputWithDiscountOfItemAsString).resultSize();

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
