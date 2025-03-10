export default class NotEnoughStockError extends Error {
    constructor() {
        super('Quantity exceeds available stock.');
    }
}