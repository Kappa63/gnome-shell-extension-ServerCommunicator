import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as RemoteFileUtils from './Utils/RemoteFileUtils.js';
import * as HttpCallUtils from './Utils/HttpCallUtils.js';
import FileMgmt from './models/FileMgmt.js';
import Order from './models/Order.js';
import APIs from './models/APIs.js';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Cogl from 'gi://Cogl';
import Soup from 'gi://Soup';
import Gio from 'gi://Gio';
import St from 'gi://St';

export default class ServerCommunicatorExtension extends Extension {
    enable() {
        this._soupSession = new Soup.Session();

        this._serverCommunicator = new ServerCommunicator({
            settings: this.getSettings(),
            openPreferences: this.openPreferences,
            uuid: this.uuid,
            session: this._soupSession,
            clipboard: St.Clipboard.get_default(),
            extensionDir: this.dir
        });
        Main.panel.addToStatusArea(this.uuid, this._serverCommunicator);
    }

    disable() {
        this._soupSession.abort()
        this._soupSession = null;

        this._serverCommunicator.destroy();
        this._serverCommunicator = null;
    }
}

const ServerCommunicator = GObject.registerClass({
    GTypeName: "ServerCommunicator"
}, class ServerCommunicator extends PanelMenu.Button {
    destroy() {
        if (this._orderChanged) {
            this._ext.settings.disconnect(this._orderChanged);
            this._orderChanged = null;
        }
        super.destroy();
    }
    
    _init(ext) {
        super._init(0.0, "ServerCommunicator");
        this._ext = ext
        this._apiModel = new APIs(this._ext.settings);
        this._fmModel = new FileMgmt(this._ext.settings);
        this._orderModel = new Order(this._ext.settings);
        
        this.add_child(new St.Icon({
            icon_name: "network-server-symbolic",
            style_class: "system-status-icon"
        }));

        this._orderChanged = this._ext.settings.connect("changed::order", () => {
            this._buildMenu();
        });

        this._buildMenu();
    }

    _buildMenu() {
        this.menu.removeAll();
        this._order = this._orderModel.getAll();
        this._apis = this._apiModel.getAll();
        this._fms = this._fmModel.getAll();

        const labelPopupList = new PopupMenu.PopupBaseMenuItem({ reactive: false, can_focus: false });
        const scrollView = new St.ScrollView({
            overlay_scrollbars: true,
            style_class: "status-area-scroll"
        });

        const vbox = new St.BoxLayout({ 
            vertical: true,
            style_class: "status-area-box"
        });
        scrollView.set_child(vbox);

        for (let o of this._order) {
            if (o.type === "API") {
                let a = this._apiModel.get(o.id);
                // if (a)
                    vbox.add_child(this._buildApiPopup(a));
            } else {
                let f = this._fmModel.get(o.id)
                // if (f)
                    vbox.add_child(this._buildFmPopup(f));
            }
        }

        labelPopupList.actor.add_child(scrollView);
        this.menu.addMenuItem(labelPopupList);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this.menu.addAction(_("Preferences"),
            () => this._ext.openPreferences());
    }

    _buildApiPopup(a) {
        const item = new PopupMenu.PopupMenuItem(a.label);

        item.actor.insert_child_at_index(new St.Icon({
            gicon: Gio.icon_new_for_string("network-transmit-symbolic"),
            style_class: "popup-menu-icon"
        }), 0);

        item.connect("activate", () => {
            (async () => {
                this.menu.close();
                try {
                    const response = await HttpCallUtils.callApi(this._ext.session, a.method, a.server, a.auth, a.params, a.body);
                    this._ext.clipboard.set_text(St.ClipboardType.CLIPBOARD, response);
                    if (a.popup)
                        this._showJsonModal(a.server, JSON.parse(response))
                    else 
                        Main.notify("Success")
                } catch (e) {
                    Main.notify(`Error: ${e.message}`);
                }
            })();
        });

        return item.actor;
    }

    _buildFmPopup(f) {
        const item = new PopupMenu.PopupMenuItem(f.label);

        item.actor.insert_child_at_index(new St.Icon({
            gicon: Gio.icon_new_for_string("folder-remote-symbolic"),
            style_class: "popup-menu-icon"
        }), 0);

        item.connect("activate", () => {
            (async () => {
                this.menu.close();
                try {
                    // global.display.set_cursor(11);
                    Main.notify("Mounting Server...")
                    await RemoteFileUtils.openRemoteInFiles(f.protocol, f.user, f.server);
                } catch (e) {
                    Main.notify(`Error: ${e.message}`);
                    // logError(e);
                } 
                // finally {
                //     global.display.set_cursor(null)
                // }
            })();
        });

        return item.actor;
    }

    _showJsonModal(url, jsonData) {
        const jsonModal = new ModalDialog.ModalDialog({});

        const sourceURL = new St.Label({
            text: `Response from ${url}`,
            style_class: "modal-dialog-title",
            x_expand: true,
        });
        sourceURL.clutter_text.set_line_wrap(true);
        sourceURL.clutter_text.set_line_wrap_mode(2);

        const jsonText = new Clutter.Text({
            text: JSON.stringify(jsonData, null, 2),
            line_wrap: true,
            line_wrap_mode: 2,
            ellipsize: 0,
            reactive: true,
            selectable: true,
            x_expand: true, 
            y_expand: true,
            color: new Cogl.Color({ red: 255, green: 255, blue: 255, alpha: 255 }),
            selected_text_color: new Cogl.Color({ red: 0, green: 0, blue: 0, alpha: 255 })
        });
        jsonText.set_width(400);

        const vp = new St.Viewport({ x_expand: true, y_expand: true });
        vp.add_child(jsonText);

        const scrollView = new St.ScrollView({
            overlay_scrollbars: true,
            style_class: "json-modal-scroll"
        });
        scrollView.set_child(vp);

        const messageLayout = new St.BoxLayout({ 
            vertical: true, 
            x_expand: true, 
            y_expand: true
        });
        messageLayout.add_child(sourceURL);
        messageLayout.add_child(scrollView);

        jsonModal.contentLayout.add_child(messageLayout);
        jsonModal.setButtons([{
            label: "Close", 
            action: () => jsonModal.close(), 
            key: Clutter.KEY_Escape 
        }]);

        jsonModal.open();
    }


});