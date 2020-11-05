// copyright (c) 2020, Matthias Behr
// util.js

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