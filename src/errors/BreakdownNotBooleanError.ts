export class BreakdownNotBooleanError extends Error {
    constructor() {
        super('Breakdown must be either true or false');
    }
}