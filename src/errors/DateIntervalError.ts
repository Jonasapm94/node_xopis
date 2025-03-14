export default class DateIntervalError extends Error {
    constructor() {
        super('Start date should not be greater than end date');
    }
}