import ModelController from './ModelController.js';

export default class FileMgmt extends ModelController {
    // id, label, protocol, user, server
    constructor(settings) {
        super(settings, "file-mgmt")
    }
}