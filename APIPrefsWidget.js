import APIsModel from './models/APIs.js';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

export const APIPrefsWidget = GObject.registerClass(
class APIPrefsWidget extends Gtk.Box {
    destroy(){
        if (this._signals.length){
            this._signals.forEach(({ widg, sig }) => widg.disconnect(sig));
            this._signals = [];
        }
        super.destroy();
    }

    _init(extension) {
        super._init({
            orientation: Gtk.Orientation.HORIZONTAL,
        });
        this._extension = extension;
        this._settings = this._extension.getSettings();
        this._model = new APIsModel(this._settings);
        this._signals = [];

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
        this._signals.push({
            widg: createApiBtn, 
            sig: createApiBtn.connect("clicked", () => this._apiAdd())
        });
        toolbar.append(createApiBtn);

        const deleteApiBtn = new Gtk.Button({ icon_name: "list-remove-symbolic" });
        this._signals.push({
            widg: deleteApiBtn, 
            sig: deleteApiBtn.connect("clicked", () => this._apiDelete())
        });
        toolbar.append(deleteApiBtn);

        return toolbar;
    }

    _apiAdd() {
        const newApi = {
            label: `API ${Date.now()}`,
            method: "GET",
            server: "localhost",
            auth: { type: "No" },
            params: null,
            body: null
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

        this._apiDetails.append(new Gtk.Label({ 
            halign: Gtk.Align.START,
            label: "Label",
            opacity: 0.7
        }));
        this._lbl = new Gtk.Entry({ placeholder_text: "Label" });
        this._labelError = new Gtk.Label({ label: "Label cannot be empty", halign: Gtk.Align.START, visible: false });
        this._labelError.get_style_context().add_class("error-label");
        this._apiDetails.append(this._lbl);
        this._apiDetails.append(this._labelError);
        
        this._apiDetails.append(new Gtk.Label({ 
            halign: Gtk.Align.START,
            label: "Options",
            margin_top: 10,
            opacity: 0.7
        }));
        this._methodCombo = new Gtk.ComboBoxText();
        this._methodCombo.append("GET", "GET");
        this._methodCombo.append("POST", "POST");
        this._methodCombo.append("PUT", "PUT");
        this._methodCombo.append("PATCH", "PATCH");
        this._methodCombo.append("DELETE", "DELETE");
        this._methodCombo.set_active(0);
        this._apiDetails.append(this._methodCombo);

        this._server = new Gtk.Entry({ placeholder_text: "Path URL" });
        this._serverError = new Gtk.Label({ label: "Server URL cannot be empty", halign: Gtk.Align.START, visible: false });
        this._serverError.get_style_context().add_class("error-label");
        this._apiDetails.append(this._server);
        this._apiDetails.append(this._serverError);
        
        this._apiDetails.append(new Gtk.Label({
            halign: Gtk.Align.START,
            label: "Authorization",
            margin_top: 10,
            opacity: 0.7
        }));
        this._authCombo = new Gtk.ComboBoxText();
        this._authCombo.append("No", "No Auth");
        this._authCombo.append("Key", "Api Key");
        this._authCombo.append("Basic", "Basic");
        this._authCombo.append("Bearer", "Bearer");
        this._authCombo.set_active(0);
        this._apiDetails.append(this._authCombo);
        this._headerName = new Gtk.Entry({ placeholder_text: "Header Name", visible: false });
        this._apiDetails.append(this._headerName);
        this._apiKey = new Gtk.Entry({ placeholder_text: "API Key", visible: false });
        this._apiDetails.append(this._apiKey);
        this._bearerKey = new Gtk.Entry({ placeholder_text: "Bearer Key", visible: false });
        this._apiDetails.append(this._bearerKey);
        this._userBasic = new Gtk.Entry({ placeholder_text: "Username", visible: false });
        this._apiDetails.append(this._userBasic);
        this._passBasic = new Gtk.Entry({ placeholder_text: "Password", visible: false });
        this._apiDetails.append(this._passBasic);

        this._apiDetails.append(new Gtk.Label({
            label: "Params - (JSON)",
            halign: Gtk.Align.START,
            margin_top: 10,
            opacity: 0.7
        }));
        this._paramsJson = new Gtk.Entry({ placeholder_text: "Params" });
        this._apiDetails.append(this._paramsJson);

        this._apiDetails.append(new Gtk.Label({
            halign: Gtk.Align.START,
            label: "Body - (JSON)",
            margin_top: 10,
            opacity: 0.7
        }));
        this._bodyJson = new Gtk.Entry({ placeholder_text: "Body" });
        this._apiDetails.append(this._bodyJson);

        this._signals.push({
            widg: this._authCombo, 
            sig: this._authCombo.connect("changed", () =>{
                const authType = this._authCombo.get_active_id();

                this._headerName.visible = authType === "Key";
                this._apiKey.visible = authType === "Key";
                this._bearerKey.visible = authType === "Bearer";
                this._userBasic.visible = authType === "Basic";
                this._passBasic.visible = authType === "Basic";

                this._onFieldChanged()
            })
        });

        [
            this._lbl,
            this._methodCombo,
            this._server,
            this._headerName,
            this._apiKey,
            this._bearerKey,
            this._userBasic,
            this._passBasic,
            this._paramsJson,
            this._bodyJson
        ].forEach(i => {
            this._signals.push({
                widg: i, 
                sig: i.connect("changed", () => this._onFieldChanged())
            });
        });

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
        // log(api)
        this._currentIndex = index;

        this._lbl.set_text(api.label);
        this._methodCombo.set_active_id(api.method);
        this._server.set_text(api.server);

        this._headerName.set_text("");
        this._apiKey.set_text("");
        this._bearerKey.set_text("");
        this._userBasic.set_text("");
        this._passBasic.set_text("");
        this._authCombo.set_active_id(api.auth.type);
        switch (api.auth.type){
            case "Key":
                this._headerName.set_text(api.auth.headerName || "");
                this._apiKey.set_text(api.auth.apiKey || "");
                break;
            case "Bearer":
                this._bearerKey.set_text(api.auth.bearerKey || "");
                break;
            case "Basic":
                this._userBasic.set_text(api.auth.user || "");
                this._passBasic.set_text(api.auth.pass || "");
                break;
        }
        this._paramsJson.set_text(api.params ?? "")
        this._bodyJson.set_text(api.body ?? "")
    }

    _onFieldChanged() {
        if (this._currentIndex === undefined)
            return;

        let valid = true;

        const label = this._lbl.get_text().trim();
        const method = this._methodCombo.get_active_id();
        const server = this._server.get_text().trim();
        const auth = this._getAuthData()
        const params = this._paramsJson.get_text().trim();
        const body = this._bodyJson.get_text().trim();

        if (!label) {
            this._labelError.visible = true;
            valid = false;
        } else {
            this._labelError.visible = false;
        }

        if (!server) {
            this._serverError.visible = true;
            valid = false;
        } else {
            this._serverError.visible = false;
        }

        if (!valid)
            return;

        const api = { label, method, server, auth, params, body };

        this._model.updateAt(this._currentIndex, api);
        this._listStore.splice(this._currentIndex, 1, [label]);
    }

    _getAuthData() {
        const type = this._authCombo.get_active_id();

        switch (type) {
            case "Key":
                return { type, headerName: this._headerName.get_text().trim(), apiKey: this._apiKey.get_text().trim() };

            case "Bearer":
                return { type, bearerKey: this._bearerKey.get_text().trim() };

            case "Basic":
                return {
                    type,
                    user: this._userBasic.get_text().trim(),
                    pass: this._passBasic.get_text().trim()
                };

            default:
                return { type };
        }
    }
});
