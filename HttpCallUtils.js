import GLib from 'gi://GLib';
import Soup from 'gi://Soup';

export async function callApi(session, method, url, auth, params, body) {
    return new Promise((resolve, reject) => {
        const message = params.length?Soup.Message.new_from_encoded_form(method, url, Soup.form_encode_hash(JSON.parse(params))):Soup.Message.new(method, url)

        switch (auth.type){
            case "Key":
                message.request_headers.append(auth.headerName, auth.apiKey);
                break;
            case "Bearer":
                message.request_headers.append("Authorization", `Bearer ${auth.bearerKey}`);
                break;
            case "Basic":
                const encoded = GLib.base64_encode(`${auth.user}:${auth.pass}`);
                message.request_headers.append("Authorization", `Basic ${encoded}`);
                break;
        }

        if (body.length) {
            const bytes = new TextEncoder().encode(body);
            message.set_request_body_from_bytes("application/json", GLib.Bytes.new(bytes));
        }

        session.send_and_read_async(
            message,
            GLib.PRIORITY_DEFAULT,
            null,
            (session, result) => {
                const status = message.status_code;
                if (status >= 200 && status < 300) {
                    const bytes = session.send_and_read_finish(result);
                    const decoder = new TextDecoder("utf-8");
                    resolve(decoder.decode(bytes.get_data()));
                } else {
                    reject(new Error(`HTTP Error ${status}`));
                }
            }
        );
    });
}
