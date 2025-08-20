import ModelController from './ModelController.js';

export default class Order extends ModelController {
    // id, label, type, trigger
    constructor(settings) {
        super(settings, "order")
    }
}