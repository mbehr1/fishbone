// copyright (c) 2020, Matthias Behr
// util.js
import jp from 'jsonpath' 

// const vscode = window.acquireVsCodeApi();
let vscode = undefined;

export function getVsCode() {
    if (vscode === undefined) {
        vscode = window.acquireVsCodeApi();
    }
    console.log(`getVsCode called. returning ${vscode}`)
    return vscode;
}

let lastReqId = 0;
let reqCallbacks = new Map();

export function sendAndReceiveMsg(req) {
    const reqId = ++lastReqId;
    const prom = new Promise(resolve => {
        console.log(`added reqId=${reqId} to callbacks`);
        reqCallbacks.set(reqId, (response) => { resolve(response); })
    });
    vscode.postMessage({ type: 'sAr', req: req, id: reqId });
    return prom;
}

export function receivedResponse(response) {
    try {
        console.log('receivedResponse id:' + response.id);
        const cb = reqCallbacks.get(response.id);
        if (cb) {
            reqCallbacks.delete(response.id);
            cb(response.res);
        }
    } catch (err) {
        console.log('receivedResponse err:' + err, JSON.stringify(response));
    }
}

export function triggerRestQuery(requestStr, jsonPath) {

    //const url = typeof requestStr === 'string' ? requestStr : requestStr.url;
     // due to e.g. CORS we cannot run the https:// request from inside, 
     // so we do forward to the extension as well
     // if (url.startsWith('ext:')) {
        return new Promise((resolve, reject) => {
            console.log(`triggerRestQuery triggering ${JSON.stringify(requestStr)} via extension`);
            try {
                sendAndReceiveMsg({ type: 'restQuery', request: requestStr }).then((res) => {
                    console.log(`triggerRestQuery got response ${JSON.stringify(res)}`);
                    // check for res.error... and trigger reject then...
                    // if we have errors we reject:
                    if ('errors' in res && res.errors.length > 0) {
                        reject(res);
                        return;
                    }

                    if (jsonPath) {
                        const data = jp.query(res.data, jsonPath);
                        console.log(`jsonPath('${jsonPath}') returned '${JSON.stringify(data)}'`);
                        resolve(data);
                    } else resolve(res);
                }).catch(reject);
            } catch (e) {
                console.log(`triggerRestQuery failed with ${e}`);
                reject(e);
            }
        });
/*    } else {
        // e.g. https:// we do directly: (todo check for https://?)
        return new Promise((resolve, reject) => {
            console.log(`triggerRestQuery triggering ${JSON.stringify(requestStr)} via fetch`);
            const username = typeof requestStr === 'object' && requestStr.username ? requestStr.username : undefined;
            const password = typeof requestStr === 'object' && requestStr.password ? requestStr.password : undefined;
            let headers = new Headers();
            if (username && password) {
                headers.set('Authorization', 'Basic ' + btoa(username + ":" + password));
            }
            fetch(url, { method: 'GET', headers: headers })
                .then(response => response.json()).then(json => resolve(json)).catch(e => reject(e));
        });
    }*/
}
