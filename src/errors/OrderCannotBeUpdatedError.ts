export default class OrderCannotBeUpdatedError extends Error {
    constructor() {
        super('Order cannot be updated.');
    }
}