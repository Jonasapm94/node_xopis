import Product from '../models/Product';

export function makeProduct(o: {
    name: string,
    sku: string,
    description: string,
    price: number,
    stock: number
}) {
    if (o.price <= 0) throw new Error('Product price must be bigger than zero');
    if (o.stock < 0) throw new Error('Product stock must not be less than zero ');

    const product = new Product();
    product.name = o.name;
    product.sku = o.sku;
    product.description = o.description;
    product.price = o.price;
    product.stock = o.stock;

    return product;
}