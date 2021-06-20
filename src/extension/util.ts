import * as vscode from 'vscode';
import * as request from 'request';
import { extensionId } from './constants';
import { URL } from 'url';

export function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

const httpCache = new Map<string, { validTill: Number, res: any, body: any }>();

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

    // do we have it in cache?
    const cachedRes = httpCache.get(urlString);
    const dateNow = Date.now();
    if (cachedRes !== undefined) {
        // is it still valid?
        if (cachedRes.validTill >= dateNow) {
            // yes
            //console.log(`retrieved from cache: ${urlString}`);
            return new Promise((resolve, reject) => resolve(cachedRes));
        } else {
            // not valid any longer, remove from cache
            //console.log(`cache too old for: ${urlString}`);
            httpCache.delete(urlString);
        }
    } else {
        //console.log(`performHttpRequest not in cache: '${urlString}' cache size=${httpCache.size}`);
    }
    // clean up cache here for all invalid ones... could do with a timer as well.
    httpCache.forEach((value, key, map) => {
        if (value.validTill < dateNow) {
            map.delete(key);
            //console.log(`deleted outdated from cache: ${urlString}`);
        }
    });

    const haveCachedAuth: any = storage.get(`http_req_${origin}`);

    const reqOptions: { url: string, headers: object, auth?: { username: string, password: string, sendImmediately: boolean } } = {
        url: urlString,
        headers: {
            'User-Agent': extensionId,
            ...headers
        }
    };
    //console.log(`performHttpRequest reqOptions='${JSON.stringify(reqOptions)}'`);

    if (haveCachedAuth !== undefined) {
        reqOptions.auth = {
            'username': haveCachedAuth.username,
            'password': haveCachedAuth.password,
            'sendImmediately': false
        };
        // console.log(`performHttpRequest reqOptions added auth for username='${reqOptions.auth.username}'`);
    }

    return new Promise((resolve, reject) => {
        request.get(reqOptions, (err: any, res: any, body: any) => {
            if (err) {
                console.warn(`performHttpRequest failed with err=`, err);
                reject(err);
            } else {
                //console.log(`performHttpRequest ${origin} got statusCode=${res.statusCode}`);
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
                    // we add to cache if cache-control is there:
                    try {
                        if ('headers' in res && 'cache-control' in res.headers) {
                            const cacheControl = res.headers['cache-control'];
                            //console.log(`cacheControl='${JSON.stringify(cacheControl)}'`);
                            if (typeof cacheControl === 'string') {
                                const rMaxAge = /max-age=(\d+)/;
                                const maxAge = cacheControl.match(rMaxAge);
                                // console.log(`maxAge=${JSON.stringify(maxAge)}`);
                                if (Array.isArray(maxAge) && maxAge.length >= 2) {
                                    const age = Number(maxAge[1]);
                                    if (age > 0) {
                                        // add to cache:
                                        // console.log(`added to cache=${urlString} age=${age}`);
                                        httpCache.set(urlString, { validTill: Date.now() + (age * 1000), res: res, body: body });
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        console.warn(`performHttpRequest got e='${e}' at response header parsing.`);
                    }
                    //console.warn(`performHttpRequest response=${JSON.stringify(res)}`);
                    resolve({ res: res, body: body });
                }
            }
        });
    });
}