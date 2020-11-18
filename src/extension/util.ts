import * as vscode from 'vscode';
import * as request from 'request';
import { URL } from 'url';

export function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}


/**
 * perform a http request with support for http basic auth credential querying/caching
 * @param storage persistent storage to cache the auth data
 * @param urlString url to perform request. e.g. 'https://api.github.com/...'
 * @param headers optional object with additional header attributes.
 * @returns a promise resolving with an obj with {res, body} or rejects with err.
 */
export function performHttpRequest(storage: vscode.Memento, urlString: string, headers: any | undefined) {

    // check whether we do have username/password cached for that host:
    const urlObj = new URL(urlString);
    const origin = urlObj.origin;
    const haveCachedAuth: any = storage.get(`http_req_${origin}`);

    const reqOptions: { url: string, headers: object, auth?: { username: string, password: string, sendImmediately: boolean } } = {
        url: urlString,
        headers: {
            'User-Agent': 'mbehr1.fishbone',
            ...headers
        }
    };
    console.log(`performHttpRequest reqOptions='${JSON.stringify(reqOptions)}'`);

    if (haveCachedAuth !== undefined) {
        reqOptions.auth = {
            'username': haveCachedAuth.username,
            'password': haveCachedAuth.password,
            'sendImmediately': false
        };
        console.log(`performHttpRequest reqOptions added auth for username='${reqOptions.auth.username}'`);
    }

    return new Promise((resolve, reject) => {
        request.get(reqOptions, (err: any, res: any, body: any) => {
            if (err) {
                console.warn(`performHttpRequest failed with err=`, err);
                reject(err);
            } else {
                console.log(`performHttpRequest ${origin} got statusCode=${res.statusCode}`);
                if (res.statusCode === 401) {
                    console.log(`got statusCode 401, with text='${body}'`);

                    // wrong auth. if we had already some, clear the current cached ones.
                    if (haveCachedAuth !== undefined) {
                        console.log(`performHttpRequest cleared cached auth for origin='${origin}'`);
                        storage.update(`http_req_${origin}`, undefined);
                    }

                    // now query new ones: and retry (if entry not aborted)
                    vscode.window.showInputBox({ prompt: `Enter username for '${origin}'`, value: haveCachedAuth?.username }).then((username) => {
                        if (username === undefined || username.length < 1) {
                            reject(`401, username input aborted.`);
                        } else {
                            // now query password:
                            vscode.window.showInputBox({ prompt: `Enter password for '${username}:'`, password: true }).then((password) => {
                                // cache those and retry
                                storage.update(`http_req_${origin}`, { username: username, password: password });
                                return performHttpRequest(storage, urlString, headers).then((result) => resolve(result), (err) => reject(err));
                            });
                        }
                    });

                } else {
                    resolve({ res: res, body: body });
                }
            }
        });
    });
}