const APIS_KEY = "apis";

export default class APIsModel {
    constructor(settings) {
        this._settings = settings;
    }

    _load() {
        return this._settings.get_strv(APIS_KEY).map(s => {
            try {
                return JSON.parse(s);
            } catch (e) {
                log(`Failed to parse API entry: ${s}`);
                return null;
            }
        }).filter(api => api !== null);
    }

    _save(list) {
        const serialized = list.map(obj => JSON.stringify(obj));
        this._settings.set_strv(APIS_KEY, serialized);
    }

    getAll() {
        return this._load();
    }

    add(api) {
        const list = this._load();
        list.push(api);
        this._save(list);
    }

    remove(label) {
        const list = this._load().filter(api => api.label !== label);
        this._save(list);
    }

    update(label, newApi) {
        const list = this._load().map(api => api.label === label ? newApi : api);
        this._save(list);
    }

    updateAt(index, newApi) {
        const list = this._load();
        list[index] = newApi;
        this._save(list);
    }

    get(label) {
        return this._load().find(api => api.label === label);
    }
}
