import Soup from 'gi://Soup';
import GLib from 'gi://GLib';

const session = new Soup.Session();

export async function callApi(method, url, apiKey = null) {
    // log(method)
    // log(url)
    // log(apiKey)
    return new Promise((resolve, reject) => {
        const message = Soup.Message.new(method, url);

        if (apiKey) {
            message.request_headers.append("X-API-Key", apiKey);
        }

        session.send_and_read_async(
            message,
            GLib.PRIORITY_DEFAULT,
            null,
            (session, result) => {
                if (message.get_status() === Soup.Status.OK) {
                    let bytes = session.send_and_read_finish(result);
                    let decoder = new TextDecoder("utf-8");
                    resolve(decoder.decode(bytes.get_data()));
                } else {
                    reject(new Error(`HTTP Error ${message.get_status()}`));
                }
            }
        );
    });
}
