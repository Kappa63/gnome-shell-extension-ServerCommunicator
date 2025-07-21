import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { APIPrefsWidget } from './APIPrefsWidget.js';
import Adw from 'gi://Adw';

export default class ServerCommunicatorPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const page = new Adw.PreferencesPage();
        const group = new Adw.PreferencesGroup({ title: 'Manage APIs' });

        const widget = new APIPrefsWidget(this);
        group.add(widget);

        page.add(group);
        window.add(page);
    }
}

