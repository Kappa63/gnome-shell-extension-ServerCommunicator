import APIsModel from './models/APIs.js';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

export const APIPrefsWidget = GObject.registerClass(
class APIPrefsWidget extends Gtk.Box {
    _init(extension) {
        super._init({
            orientation: Gtk.Orientation.HORIZONTAL,
        });
        this._extension = extension;
        this._settings = this._extension.getSettings();
        this._model = new APIsModel(this._settings);

        this.append(this._buildLeftApiList());
        this.append(this._buildRightApiEdit())
    }

    _buildLeftApiList() {
        const sideLeft = new Gtk.Box({
            margin_start: 10,
            margin_end: 10,
            margin_top: 10,
            margin_bottom: 10,
            orientation: Gtk.Orientation.VERTICAL,
            width_request: 240,
        });
        sideLeft.append(this._createApiView());
        sideLeft.append(this._createToolbar());

        return sideLeft;
    }

    _createApiView() {
        this._listStore = new Gtk.StringList();

        const apis = this._model.getAll();
        for (const api of apis) {
            this._listStore.append(api.label);
        }

        this._selectionModel = new Gtk.SingleSelection({
            model: this._listStore
        });

        this._selectionModel.connect("notify::selected", () => this._onSelectionChanged());

        this._listView = new Gtk.ListView({
            model: this._selectionModel,
            factory: new Gtk.SignalListItemFactory(),
            vexpand: true
        });

        this._listView.factory.connect("setup", (factory, listItem) => {
            listItem.child = new Gtk.Label({ xalign: 0 });
        });

        this._listView.factory.connect("bind", (factory, listItem) => {
            const label = listItem.child;
            const item = listItem.item;
            label.set_label(item.get_string());
        });

        return this._listView;
    }

    _createToolbar() {
        const toolbar = new Gtk.Box({ spacing: 6 });

        const createApiBtn = new Gtk.Button({ icon_name: "list-add-symbolic" });
        createApiBtn.connect("clicked", () => this._apiAdd());
        toolbar.append(createApiBtn);

        const deleteApiBtn = new Gtk.Button({ icon_name: "list-remove-symbolic" });
        deleteApiBtn.connect("clicked", () => this._apiDelete());
        toolbar.append(deleteApiBtn);

        return toolbar;
    }

    _apiAdd() {
        const newApi = {
            label: `API ${Date.now()}`,
            server: "localhost",
            apiKey: "",
            method: "GET"
        };

        this._model.add(newApi);
        this._listStore.append(newApi.label);
    }

    _apiDelete() {
        const selectedIndex = this._selectionModel.get_selected();
        if (selectedIndex === -1)
            return;

        const label = this._listStore.get_string(selectedIndex);

        this._model.remove(label);
        this._listStore.remove(selectedIndex);
    }

    _buildRightApiEdit() {
        this._apiDetails = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 6,
            margin_top: 10,
            margin_bottom: 10,
            margin_start: 10,
            margin_end: 10,
            hexpand: true,
            vexpand: true
        });

        this._lbl = new Gtk.Entry({ placeholder_text: "Label" });
        this._labelError = new Gtk.Label({ label: "", halign: Gtk.Align.START });
        this._labelError.get_style_context().add_class("error-label");

        this._server = new Gtk.Entry({ placeholder_text: "Path URL" });
        this._serverError = new Gtk.Label({ label: "", halign: Gtk.Align.START });
        this._serverError.get_style_context().add_class("error-label");

        this._apiKey = new Gtk.Entry({ placeholder_text: "API Key" });

        this._methodCombo = new Gtk.ComboBoxText();
        this._methodCombo.append("GET", "GET");
        this._methodCombo.append("POST", "POST");
        this._methodCombo.append("PUT", "PUT");
        this._methodCombo.append("PATCH", "PATCH");
        this._methodCombo.append("DELETE", "DELETE");
        this._methodCombo.set_active(0);

        this._apiDetails.append(this._lbl);
        this._apiDetails.append(this._labelError);
        
        this._apiDetails.append(this._server);
        this._apiDetails.append(this._serverError);
        
        this._apiDetails.append(this._apiKey);
        
        this._apiDetails.append(this._methodCombo);

        this._lbl.connect("changed", () => this._onFieldChanged());
        this._server.connect("changed", () => this._onFieldChanged());
        this._apiKey.connect("changed", () => this._onFieldChanged());
        this._methodCombo.connect("changed", () => this._onFieldChanged());

        this._onSelectionChanged();

        return this._apiDetails;
    }

    _onSelectionChanged() {
        const index = this._selectionModel.get_selected();
        if (this._listStore.get_n_items() === 0) {
            this._apiDetails.set_visible(false);
            this._currentIndex = undefined;
            return;
        }

        this._apiDetails.set_visible(true);
        const api = this._model.getAll()[index];
        log(api)
        this._currentIndex = index;

        this._lbl.set_text(api.label);
        this._server.set_text(api.server);
        this._apiKey.set_text(api.apiKey??"");
        this._methodCombo.set_active_id(api.method??"GET");
    }

    _onFieldChanged() {
        if (this._currentIndex === undefined)
            return;

        let valid = true;

        const label = this._lbl.get_text().trim();
        const server = this._server.get_text().trim();
        const apiKey = this._apiKey.get_text().trim() || null;
        const method = this._methodCombo.get_active_id();

        if (!label) {
            this._labelError.set_text("Label cannot be empty");
            valid = false;
        } else {
            this._labelError.set_text("");
        }

        if (!server) {
            this._serverError.set_text("Server URL cannot be empty");
            valid = false;
        } else {
            this._serverError.set_text("");
        }

        if (!valid)
            return;

        const api = { label, server, apiKey, method };

        this._model.updateAt(this._currentIndex, api);
        this._listStore.splice(this._currentIndex, 1, [label]);
    }
});
