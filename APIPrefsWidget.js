import FileMgmt from './models/FileMgmt.js';
import Order from './models/Order.js';
import APIs from './models/APIs.js';
import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
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
        this._apiModel = new APIs(this._settings);
        this._fmModel = new FileMgmt(this._settings);
        this._orderModel = new Order(this._settings)
        this._signals = [];

        this.append(this._buildLeftColumn());
        this.append(this._buildRightColumn())
    }

    _buildLeftColumn() {
        const leftCol = new Gtk.Box({
            margin_start: 10,
            margin_end: 10,
            margin_top: 10,
            margin_bottom: 10,
            orientation: Gtk.Orientation.VERTICAL,
            width_request: 240,
        });
        leftCol.append(this._buildLabelsList());
        leftCol.append(this._buildToolbar());

        return leftCol;
    }

    _buildLabelsList() {
        this._listStore = new Gtk.ListStore();
        this._listStore.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING, GObject.TYPE_STRING]);

        const labels = this._orderModel.getAll();
        for (const l of labels) {
            const iter = this._listStore.append();
            this._listStore.set_value(iter, 0, l.label);
            this._listStore.set_value(iter, 1, l.type);
            this._listStore.set_value(iter, 2, l.id);
        }

        this._treeView = new Gtk.TreeView({
            model: this._listStore,
            headers_visible: false,
            reorderable: true,
            vexpand: true,
        });

        const lblCol = new Gtk.TreeViewColumn({ title: "Label" });
        const lblRenderer = new Gtk.CellRendererText();
        lblCol.pack_start(lblRenderer, true);
        lblCol.add_attribute(lblRenderer, "text", 0);
        this._treeView.insert_column(lblCol, 0);

        const typeCol = new Gtk.TreeViewColumn({ title: "Type" });
        const typeRenderer = new Gtk.CellRendererText();
        typeRenderer.xalign = 1.0;
        typeCol.pack_start(typeRenderer, true);
        typeCol.add_attribute(typeRenderer, "text", 1);
        this._treeView.insert_column(typeCol, 1);

        this._selection = this._treeView.get_selection();
        this._selection.connect("changed", this._onSelectionChanged.bind(this));

        return this._treeView;
    }

    _buildToolbar() {
        const toolbar = new Gtk.Box({ spacing: 6 });

        const addBtn = new Gtk.MenuButton({ icon_name: "list-add-symbolic" });

        const popover = new Gtk.Popover();
        addBtn.set_popover(popover);

        const vbox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 4 });
        popover.set_child(vbox);

        for (let option of ["API", "File Transfer"]) {
            const item = new Gtk.Button({ label: option });
            item.connect("clicked", () => {
                if (option === "API") this._apiAdd();
                else if (option === "File Transfer") this._fileTransferAdd();
                popover.popdown();
            });
            vbox.append(item);
        }

        toolbar.append(addBtn);

        const deleteApiBtn = new Gtk.Button({ icon_name: "list-remove-symbolic" });
        this._signals.push({
            widg: deleteApiBtn, 
            sig: deleteApiBtn.connect("clicked", () => this._lblDelete())
        });
        toolbar.append(deleteApiBtn);

        return toolbar;
    }

    _apiAdd() {
        const newApi = {
            id: GLib.uuid_string_random(),
            label: `API ${Date.now()}`,
            method: "GET",
            server: "localhost",
            auth: { type: "No" },
            params: null,
            body: null,
            popup: false
        };

        this._apiModel.add(newApi);
        const iter = this._listStore.append();
        this._listStore.set_value(iter, 0, newApi.label);
        this._listStore.set_value(iter, 1, "API");
        this._listStore.set_value(iter, 2, newApi.id);
        this._orderModel.add({id: newApi.id, label: newApi.label, type: "API", trigger: false})
    }
    
    _fileTransferAdd(){
        const newFp = {
            id: GLib.uuid_string_random(),
            label: `FM ${Date.now()}`,
            protocol: "SFTP",
            user: "root",
            server: "localhost",
        };

        this._fmModel.add(newFp);
        const iter = this._listStore.append();
        this._listStore.set_value(iter, 0, newFp.label);
        this._listStore.set_value(iter, 1, "FILE");
        this._listStore.set_value(iter, 2, newFp.id);
        this._orderModel.add({id: newFp.id, label: newFp.label, type: "FILE", trigger: false})
    }

    _lblDelete() {
        const [ok, _, iter] = this._selection.get_selected();
        if (!ok) {
            this._apiDetails.set_visible(false);
            this._currentId = undefined;
            return;
        }

        const id = this._listStore.get_value(iter, 2);
        const type = this._listStore.get_value(iter, 1);


        if (type === "API"){
            this._apiModel.remove(id);
        } else {
            this._fmModel.remove(id);
        }

        this._orderModel.remove(id);

        this._listStore.remove(iter);
    }

    _buildRightColumn() {
        this._details = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 6,
            margin_top: 10,
            margin_bottom: 10,
            margin_start: 10,
            margin_end: 10,
            hexpand: true,
            vexpand: true
        });

        this._details.append(new Gtk.Label({ 
            halign: Gtk.Align.START,
            label: "Label",
            opacity: 0.7
        }));

        this._lbl = new Gtk.Entry({ placeholder_text: "Label" });
        this._labelError = new Gtk.Label({ label: "Label cannot be empty", halign: Gtk.Align.START, visible: false });
        this._labelError.get_style_context().add_class("error-label");
        this._details.append(this._lbl);
        this._details.append(this._labelError);

        this._details.append(this._buildApiDetails());

        this._details.append(this._buildFmDetails());

        this._signals.push({
            widg: this._lbl, 
            sig: this._lbl.connect("changed", () => this._onFieldChanged())
        });

        this._onSelectionChanged();

        return this._details;
    }

    _buildApiDetails() {
        this._apiDetails = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, spacing: 6})
        
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

        this._apiServer = new Gtk.Entry({ placeholder_text: "Path URL" });
        this._apiServerError = new Gtk.Label({ label: "Server URL cannot be empty", halign: Gtk.Align.START, visible: false });
        this._apiServerError.get_style_context().add_class("error-label");
        this._apiDetails.append(this._apiServer);
        this._apiDetails.append(this._apiServerError);
        
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

        this._popupResponse = new Gtk.CheckButton({ label: "Popup Response" });
        this._apiDetails.append(this._popupResponse);

        this._signals.push({
            widg: this._popupResponse, 
            sig: this._popupResponse.connect("toggled", () =>{ this._onApiChanged() })
        });

        this._signals.push({
            widg: this._authCombo, 
            sig: this._authCombo.connect("changed", () =>{
                const authType = this._authCombo.get_active_id();

                this._headerName.visible = authType === "Key";
                this._apiKey.visible = authType === "Key";
                this._bearerKey.visible = authType === "Bearer";
                this._userBasic.visible = authType === "Basic";
                this._passBasic.visible = authType === "Basic";

                this._onApiChanged()
            })
        });

        [
            this._methodCombo,
            this._apiServer,
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
                sig: i.connect("changed", () => this._onApiChanged())
            });
        });

        return this._apiDetails
    }

    _buildFmDetails() {
        this._fmDetails = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, spacing: 6})

        this._fmDetails.append(new Gtk.Label({ 
            halign: Gtk.Align.START,
            label: "Protocol",
            margin_top: 10,
            opacity: 0.7
        }));
        this._protocolCombo = new Gtk.ComboBoxText();
        this._protocolCombo.append("SFTP", "SFTP");
        this._protocolCombo.append("FTP", "FTP");
        this._protocolCombo.set_active(0);
        this._fmDetails.append(this._protocolCombo);

        this._fmDetails.append(new Gtk.Label({ 
            halign: Gtk.Align.START,
            label: "Details",
            margin_top: 10,
            opacity: 0.7
        }));

        this._fmServer = new Gtk.Entry({ placeholder_text: "Path URL" });
        this._fmServerError = new Gtk.Label({ label: "Server URL cannot be empty", halign: Gtk.Align.START, visible: false });
        this._fmServerError.get_style_context().add_class("error-label");
        this._fmDetails.append(this._fmServer);
        this._fmDetails.append(this._fmServerError);

        this._user = new Gtk.Entry({ placeholder_text: "User" });
        this._userError = new Gtk.Label({ label: "User cannot be empty", halign: Gtk.Align.START, visible: false });
        this._userError.get_style_context().add_class("error-label");
        this._fmDetails.append(this._user);
        this._fmDetails.append(this._userError);

        [
            this._protocolCombo,
            this._user,
            this._fmServer,
        ].forEach(i => {
            this._signals.push({
                widg: i, 
                sig: i.connect("changed", () => this._onFmChanged())
            });
        });

        return this._fmDetails;
    }

    _onSelectionChanged() {
        const newOrder = [];
        const [exists, currentIter] = this._listStore.get_iter_first();
        if (!exists){
            this._details.set_visible(false);
            return;
        }

        do {
            const ord = this._orderModel.get(this._listStore.get_value(currentIter, 2));
            if (ord) newOrder.push(ord);
        } while (this._listStore.iter_next(currentIter));

        this._orderModel._save(newOrder);
        
        const [ok, model, iter] = this._selection.get_selected();
        if (!ok) {
            this._details.set_visible(false);
            this._currentId = undefined;
            return;
        }
        const type  = model.get_value(iter, 1);
        this._currentId = model.get_value(iter, 2);

        if (type === "API"){
            this._updateApiSelected();
        } else {
            this._updateFmSelected();
        }

        this._details.set_visible(true);
    }

    _updateApiSelected() {
        this._apiDetails.set_visible(true);
        this._fmDetails.set_visible(false);

        const api = this._apiModel.get(this._currentId);

        if (!api) return;

        this._lbl.set_text(api.label);
        this._methodCombo.set_active_id(api.method);
        this._apiServer.set_text(api.server);

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
        this._paramsJson.set_text(api.params ?? "");
        this._bodyJson.set_text(api.body ?? "");
        this._popupResponse.set_active(api.popup);
    }

    _updateFmSelected() {
        this._apiDetails.set_visible(false);
        this._fmDetails.set_visible(true);

        const fm = this._fmModel.get(this._currentId);
        
        this._lbl.set_text(fm.label);
        this._protocolCombo.set_active_id(fm.protocol);
        this._user.set_text(fm.user);
        this._fmServer.set_text(fm.server);
    }

    _onFieldChanged() {
        const [ok, model, iter] = this._selection.get_selected();
        if (!ok || !iter) {
            return;
        }
        const type  = model.get_value(iter, 1);

        if (type === "API") {
            this._onApiChanged(iter);
        } else {
            this._onFmChanged(iter);
        }
    }

    _onApiChanged(iter) {
        if (this._currentId === undefined)
            return;
        let valid = true;

        const label = this._lbl.get_text().trim();
        const server = this._apiServer.get_text().trim();

        if (!label) {
            this._labelError.visible = true;
            valid = false;
        } else {
            this._labelError.visible = false;
        }

        if (!server) {
            this._apiServerError.visible = true;
            valid = false;
        } else {
            this._apiServerError.visible = false;
        }

        if (!valid)
            return;

        const api = { 
                        id: this._currentId, 
                        label, 
                        method: this._methodCombo.get_active_id(),
                        server,
                        auth: this._getAuthData(), 
                        params: this._paramsJson.get_text().trim(),
                        body: this._bodyJson.get_text().trim(),
                        popup: this._popupResponse.get_active()
                    };

        const order = { 
                        id: this._currentId, 
                        label, 
                        type: "API",
                        trigger: !this._orderModel.get(this._currentId).trigger
                      };

        this._apiModel.update(this._currentId, api);
        this._orderModel.update(this._currentId, order)

        if (!iter){
            const [ok, _, p] = this._selection.get_selected();
            if (!ok) return
            iter = p
        }

        this._listStore.set(iter, [0], [label]);
    }

    _onFmChanged(iter) {
        if (this._currentId === undefined)
            return;

        let valid = true;

        const label = this._lbl.get_text().trim();
        const user = this._user.get_text().trim()
        const server = this._fmServer.get_text().trim();

        if (!label) {
            this._labelError.visible = true;
            valid = false;
        } else {
            this._labelError.visible = false;
        }

        if (!user) {
            this._userError.visible = true;
            valid = false;
        } else {
            this._userError.visible = false;
        }

        if (!server) {
            this._fmServerError.visible = true;
            valid = false;
        } else {
            this._fmServerError.visible = false;
        }
        if (!valid)
            return;

        const fm = { 
                        id: this._currentId,
                        label, 
                        protocol: this._protocolCombo.get_active_id(), 
                        user, 
                        server 
                    };
        const order = { 
                        id: this._currentId, 
                        label, 
                        type: "FILE",
                        trigger: !this._orderModel.get(this._currentId).trigger
                    };
        
        this._fmModel.update(this._currentId, fm);
        this._orderModel.update(this._currentId, order);

        if (!iter){
            const [ok, _, p] = this._selection.get_selected();
            if (!ok) return
            iter = p
        }

        this._listStore.set(iter, [0], [label]);
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
