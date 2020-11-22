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
                    console.log(`triggerRestQuery got response ${JSON.stringify(res).slice(0, 100)}`);
                    // check for res.error... and trigger reject then...
                    // if we have errors we reject:
                    if ('errors' in res && res.errors.length > 0) {
                        reject(res);
                        return;
                    }

                    if (jsonPath) {
                        const data = jp.query(res.data, jsonPath);
                        console.log(`jsonPath('${jsonPath}') returned '${JSON.stringify(data).slice(0, 100)}'`);
                        resolve(data);
                    } else resolve(res);
                }).catch(reject);
            } catch (e) {
                console.log(`triggerRestQuery failed with ${e}`);
                reject(e);
            }
        });
}

/**
 * perform triggerRestRequery and return the processing details
 * @param {*} dataSourceObj object with source, jsonPath, conv
 * @returns object with error| result and restQueryResult, jsonPathResult, convResult
 */
export async function triggerRestQueryDetails(dataSourceObj) {
    const answer = {};
    try {
        const res = await triggerRestQuery(dataSourceObj.source);
        answer.restQueryResult = res;

        let result = res;
        if (dataSourceObj.jsonPath?.length > 0) {
            result = jp.query(res, dataSourceObj.jsonPath);
            answer.jsonPathResult = result;
        }
        if (dataSourceObj.conv?.length > 0) {
            const dataConv = dataSourceObj.conv;
            const indexFirstC = dataConv.indexOf(':');
            const convType = dataConv.slice(0, indexFirstC);
            const convParam = dataConv.slice(indexFirstC + 1);
            //console.log(`convType='${convType}' convParam='${convParam}'`);
            switch (convType) {
                case 'length':
                    answer.convResult = Array.isArray(result) ? result.length : 0;
                    //console.log(`conv length from ${JSON.stringify(result)} returns '${answer.convResult}'`);
                    break;
                case 'index':
                    answer.convResult = Array.isArray(result) && result.length > Number(convParam) ? (typeof result[Number(convParam)] === 'string' ? result[Number(convParam)] : JSON.stringify(result[Number(convParam)])) : 0;
                    break;
                case 'func':
                    // todo try catch... conv to string/number
                    try {
                        // eslint-disable-next-line no-new-func
                        const fn = new Function("result", convParam);
                        const fnRes = fn(result);
                        //console.log(`typeof fnRes='${typeof fnRes}'`);
                        switch (typeof fnRes) {
                            case 'string': answer.convResult = fnRes; break;
                            case 'number': answer.convResult = fnRes; break;
                            case 'object': answer.convResult = JSON.stringify(fnRes); break;
                            default:
                                answer.convResult = `unknown result type '${typeof fnRes}'. Please return string or number`;
                                break;
                        }
                    } catch (e) {
                        answer.convResult = `got error e='${e}' from conv function`;
                    }
                    break;
                default:
                    answer.convResult = `unknown convType ${convType}`;
                    break;
            }
        }
        answer.result = answer.convResult !== undefined ? answer.convResult : (answer.jsonPathResult !== undefined ? answer.jsonPathResult : answer.restQueryResult);
    } catch (e) {
        console.log(`triggerRestQueryDetails got error=`, e);
        answer.error = e && e.errors && Array.isArray(e.errors) ? e.errors.join(' / ') : `unknown error:'${JSON.stringify(e)}'`;
    }
    return answer;
}

/**
 * Compare to objects for shallow equity. I.e.
 * same amount of keys and each key has the same value.
 * Take care: if the key has an object as value the object
 * is compared and not whether those objects have same keys...
 * @param {*} object a 
 * @param {*} object b
 * @returns true is the objects are equal on first level 
 */
export function objectShallowEq(a, b) {
    //console.log(`objectShallowEq comp `, a, b);
    if (typeof a !== typeof b) return false;
    const objAKeys = Object.keys(a);
    if (objAKeys.length !== Object.keys(b).length) return false;
    let eq = true;
    for (let i = 0; eq && i < objAKeys.length; ++i) {
        const key = objAKeys[i];
        eq = a[key] === b[key];
    }
    // console.log(`objectShallowEq eq=${eq} `, a, b);
    return eq;
}