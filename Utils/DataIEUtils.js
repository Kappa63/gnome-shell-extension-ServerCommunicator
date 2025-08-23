import Gio from 'gi://Gio';

export function exportSchema(json) {
    let outStream = Gio.File.new_for_path("Downloads/server-communicator-GE.json")
                            .replace(null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);

    outStream.write(json, null);
    outStream.close(null);
}

export function importSchema(path) {
    let file = Gio.File.new_for_path(path);

    let [ok, contents] = file.load_contents(null);
    if (!ok) 
        return;
    return JSON.parse(imports.byteArray.toString(contents));
}