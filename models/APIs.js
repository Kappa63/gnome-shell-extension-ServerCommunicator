import ModelController from './ModelController.js';

export default class APIs extends ModelController {
    // id, label, method, server, auth, params, body, popup
    constructor(settings) {
        super(settings, "apis")
    }
}