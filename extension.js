import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as HttpCallUtils from './HttpCallUtils.js';
import APIsModel from './models/APIs.js';
import GObject from 'gi://GObject';
import St from 'gi://St';

export default class ServerCommunicatorExtension extends Extension {
    enable() {
        this._serverCommunicator = new ServerCommunicator({
            settings: this.getSettings(),
            openPreferences: this.openPreferences,
            uuid: this.uuid,
            clipboard: St.Clipboard.get_default()
        });
        Main.panel.addToStatusArea(this.uuid, this._serverCommunicator);
    }

    disable() {
        this._serverCommunicator.destroy();
        this._serverCommunicator = null;
    }
}

const ServerCommunicator = GObject.registerClass({
    GTypeName: "ServerCommunicator"
}, class ServerCommunicator extends PanelMenu.Button {
    destroy() {
        if (this._apiChanged) {
            this._ext.settings.disconnect(this._apiChanged);
            this._apiChanged = null;
        }
        super.destroy();
    }
    
    _init(ext) {
        super._init(0.0, "ServerCommunicator");
        this._ext = ext

        this._model = new APIsModel(this._ext.settings);
        
        this.add_child(new St.Icon({
            icon_name: "network-server-symbolic",
            style_class: "system-status-icon",
        }));

        this._apiChanged = this._ext.settings.connect("changed::apis", () => {
            this._buildMenu();
        });

        this._buildMenu();
    }

    _buildMenu() {
        this.menu.removeAll();
        this._apis = this._model.getAll();

        const scrollItem = new PopupMenu.PopupBaseMenuItem({ reactive: false, can_focus: false });
        const scrollView = new St.ScrollView({
            style_class: "popup-menu-scroll-container",
            overlay_scrollbars: true
        });
        scrollView.set_height(200);

        const vbox = new St.BoxLayout({ vertical: true });
        scrollView.set_child(vbox);

        for (let a of this._apis) {
            const item = new PopupMenu.PopupMenuItem(a.label);
            item.connect("activate", async () => {
                try {
                    log(a)
                    const response = await HttpCallUtils.callApi(a.method, a.server, a.auth, a.params, a.body);
                    Main.notify(`Success: ${response.substring(0, 100)}`);
                    this._ext.clipboard.set_text(St.ClipboardType.CLIPBOARD, response);
                } catch (e) {
                    Main.notify(`Error: ${e.message}`);
                }
            });
            vbox.add_child(item.actor);
        }

        scrollItem.actor.add_child(scrollView);
        this.menu.addMenuItem(scrollItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this.menu.addAction(_("Preferences"),
            () => this._ext.openPreferences());
    }
});