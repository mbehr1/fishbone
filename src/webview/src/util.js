// copyright (c) 2020 - 2023, Matthias Behr
// util.js
import jp from 'jsonpath'

// provide JSON5.parse for conversion functions:
import JSON5 from 'json5'
import * as uv0 from 'dlt-logs-utils'
import { rqUriDecode, rqUriEncode } from 'dlt-logs-utils/restQuery'

// eslint-disable-next-line no-undef
if (!globalThis.JSON5) {
  // eslint-disable-next-line no-undef
  globalThis.JSON5 = JSON5
}

// eslint-disable-next-line no-undef
if (!globalThis.uv0) {
  // eslint-disable-next-line no-undef
  globalThis.uv0 = uv0
}

class StandaloneApi {
  isStandaloneApi = true

  #state = undefined

  constructor() {
    console.log(`StandaloneApi constructor()`)
  }
  getState() {
    // : any{
    console.log(`StandaloneApi.getState()`)
    return this.#state
  }
  setState(newState /*: any*/) /* => any;*/ {
    console.log(`StandaloneApi.setState()`)
    this.#state = { ...newState }
  }
  postMessage(message /*: any) => void;*/) {
    console.log(`StandaloneApi.postMessage(${JSON.stringify(message)}) nyi!`)
  }
}

// const vscode = window.acquireVsCodeApi();
let vscode = undefined

export function getVsCode() {
  if (vscode === undefined) {
    if (typeof window.acquireVsCodeApi === 'function') {
      vscode = window.acquireVsCodeApi()
    } else {
      // we seem to run standalone (aka in a browser)
      vscode = new StandaloneApi()
    }
  }
  //console.log(`getVsCode called. returning ${vscode}`)
  return vscode
}

let lastReqId = 0
let reqCallbacks = new Map()

export function sendAndReceiveMsg(req) {
  const reqId = ++lastReqId
  const prom = new Promise((resolve) => {
    //console.log(`added reqId=${reqId} to callbacks`);
    reqCallbacks.set(reqId, (response) => {
      resolve(response)
    })
  })
  vscode.postMessage({ type: 'sAr', req: req, id: reqId })
  return prom
}

export function receivedResponse(response) {
  try {
    //console.log('receivedResponse id:' + response.id);
    const cb = reqCallbacks.get(response.id)
    if (cb) {
      reqCallbacks.delete(response.id)
      cb(response.res)
    }
  } catch (err) {
    console.log('receivedResponse err:' + err, JSON.stringify(response))
  }
}

function triggerRestQuery(requestStr, jsonPath) {
  //const url = typeof requestStr === 'string' ? requestStr : requestStr.url;
  // due to e.g. CORS we cannot run the https:// request from inside,
  // so we do forward to the extension as well
  // if (url.startsWith('ext:')) {
  return new Promise((resolve, reject) => {
    //console.log(`triggerRestQuery triggering ${JSON.stringify(requestStr)} via extension`);
    try {
      sendAndReceiveMsg({ type: 'restQuery', request: requestStr })
        .then((res) => {
          //console.log(`triggerRestQuery got response ${JSON.stringify(res).slice(0, 100)}`);
          // check for res.error... and trigger reject then...
          // if we have errors we reject:
          if ('errors' in res && res.errors.length > 0) {
            reject(res)
            return
          }

          if (jsonPath) {
            const data = jp.query(res.data, jsonPath)
            //console.log(`jsonPath('${jsonPath}') returned '${JSON.stringify(data).slice(0, 100)}'`);
            resolve(data)
          } else resolve(res)
        })
        .catch(reject)
    } catch (e) {
      console.log(`triggerRestQuery failed with ${e}`)
      reject(e)
    }
  })
}

/**
 * perform triggerRestRequery and return the processing details
 * @param {*} dataSourceObj object with source, jsonPath, conv
 * @returns object with error| result and restQueryResult, jsonPathResult, convResult
 */
export async function triggerRestQueryDetails(dataSourceObj, attributes) {
  const answer = {}
  try {
    const reqSource = dataSourceObj.source

    const replaceAttr = (match, p1, offset, wrapStringInQuotes) => {
      //console.log(`replacing '${match}' '${p1}' at offset ${offset}`);
      if (p1.startsWith('attributes.')) {
        // currently only attribute supported
        let attrName = p1.slice(p1.indexOf('.') + 1)
        let attrKey = undefined
        const dotPos = attrName.indexOf('.')
        if (dotPos >= 1) {
          attrKey = attrName.slice(dotPos + 1)
          attrName = attrName.slice(0, dotPos)
        }
        // console.log(`triggerRestQueryDetails attrName='${attrName}' attrKey='${attrKey}'`)
        const attribute = attributes?.find((attr) => {
          const name = Object.keys(attr).find((key) => key !== 'fbUid')
          return name === attrName
        })
        if (attribute !== undefined) {
          const attrValue = attribute[attrName].value
          const attrKeyValue = Array.isArray(attrValue)
            ? attrValue.map((e) => (attrKey ? e[attrKey] : e))
            : attrKey
              ? attrValue && attrKey in attrValue
                ? attrValue[attrKey]
                : null
              : attrValue
          if (typeof attrKeyValue === 'string') {
            // console.log(`attrKeyValue='${attrKeyValue}'`, attribute);
            return wrapStringInQuotes ? `"${attrKeyValue}"` : attrKeyValue
          } else {
            // console.log(`attrKeyValue='${JSON.stringify(attrKeyValue)}'`, attribute);
            return JSON.stringify(attrKeyValue)
          }
        }
        return wrapStringInQuotes ? `"<unknown attribute:${attrName}>"` : `<unknown attribute:${attrName}>`
      }
      return wrapStringInQuotes ? `"${p1}"` : p1
    }

    let requestStr = ''
    if (typeof reqSource === 'string') {
      // rules are:
      // "${attributes.name}"
      //  -> "<value of attr.name" (with brackets if .name is of type string)
      //  -> JSON representation otherwise (e.g. for arrays [...])
      // problem is that arrays should not be "" quoted.

      // to reduce risk we limit the new handling of replacing ${attribute..*} only to requests with "conversionFunction" inside:
      if (!reqSource.includes('conversionFunction')) {
        requestStr = reqSource.replace(/"\$\{(.*?)\}"/g, (match, p1, offset) => replaceAttr(match, p1, offset, true))
        // replace the URI encoded ones as well, but uri encode them then:
        requestStr = requestStr.replace(/%22%24%7B(.*?)%7D%22/g, (match, p1, offset) =>
          encodeURIComponent(replaceAttr(match, p1, offset, true)),
        )
        // support uri encoded attrs like ${attributes.*} (w.o. being double enquoted) as well:
        requestStr = requestStr.replace(/%24%7B(.*?)%7D/g, (match, p1, offset) => encodeURIComponent(replaceAttr(match, p1, offset, false)))
      } else {
        // console.log(`triggerRestQueryDetails got conversionFunction. Replacing attributes in requestStr='${reqSource}'`)
        // we only want attributes in the form of "${attributes.name}" to be replaced within filter expression (apid, ctid,... but not within reportOptions...)
        try {
          const rq = rqUriDecode(reqSource)
          // console.log(`triggerRestQueryDetails got rq.path=${rq.path} rq.cmds.length=${rq.commands.length}`)
          // scan all cmds for filter and replace attributes:
          for (const cmd of rq.commands) {
            if (cmd.param?.includes('${attributes.')) {
              switch (cmd.cmd) {
                case 'report':
                case 'query':
                  // filters are the array
                  const filters = JSON5.parse(cmd.param)
                  if (Array.isArray(filters)) {
                    for (const filter of filters) {
                      if (typeof filter === 'object') {
                        for (const key of Object.keys(filter)) {
                          const val = filter[key]
                          if (typeof val === 'string' && val.includes('${attributes.')) {
                            console.log(`triggerRestQueryDetails replacing attributes in filter[${key}] from '${val}'`)
                            // todo optimize! need to replace to object/array/string and not a string representation of it...
                            filter[key] = JSON.parse(
                              JSON.stringify(val).replace(/"\$\{(.*?)\}"/g, (match, p1, offset) => replaceAttr(match, p1, offset, true)),
                            )
                            console.log(`triggerRestQueryDetails replacing attributes in filter[${key}] to   '${filter[key]}'`)
                          }
                        }
                      } else {
                        console.warn(`triggerRestQueryDetails got non object filter=${filter}`)
                      }
                    }
                    cmd.param = JSON.stringify(filters)
                  } else {
                    console.warn(`triggerRestQueryDetails got non array filters=${filters}`)
                  }
                  break
                default:
                  // replace all attributes in the cmd.param:
                  cmd.param = cmd.param.replace(/"\$\{(.*?)\}"/g, (match, p1, offset) => replaceAttr(match, p1, offset, true))
              }
            }
          }
          requestStr = rqUriEncode(rq)
        } catch (e) {
          console.warn(`triggerRestQueryDetails replacing attributes failed with ${e} using initial str`)
          requestStr = reqSource
        }
      }
    }

    const res = await triggerRestQuery(requestStr)
    answer.restQueryResult = res

    let result = res
    if (dataSourceObj.jsonPath?.length > 0) {
      result = jp.query(res, dataSourceObj.jsonPath)
      answer.jsonPathResult = result
    }
    if (dataSourceObj.conv?.length > 0) {
      const dataConv = dataSourceObj.conv
      const indexFirstC = dataConv.indexOf(':')
      const convType = dataConv.slice(0, indexFirstC)
      const convParam = dataConv.slice(indexFirstC + 1)
      // console.log(`convType='${convType}' convParam='${convParam}' result=`, result);
      switch (convType) {
        case 'length':
          answer.convResult = Array.isArray(result) ? result.length : 0
          // console.log(`conv length from ${JSON.stringify(result)} returns '${JSON.stringify(answer.convResult)}'`);
          break
        case 'index':
          answer.convResult =
            Array.isArray(result) && result.length > Number(convParam)
              ? typeof result[Number(convParam)] === 'string'
                ? result[Number(convParam)]
                : JSON.stringify(result[Number(convParam)])
              : 0
          break
        case 'func':
          // todo try catch... conv to string/number
          try {
            // eslint-disable-next-line no-new-func
            const fn = new Function('result', convParam)
            const fnRes = fn(result)
            //console.log(`typeof fnRes='${typeof fnRes}'`);
            switch (typeof fnRes) {
              case 'string':
              case 'number':
                answer.convResult = fnRes
                break
              case 'object':
                answer.convResult = JSON.stringify(fnRes)
                break
              default:
                answer.convResult = `unknown result type '${typeof fnRes}'. Please return string or number`
                break
            }
          } catch (e) {
            answer.convResult = `got error e='${e}' from conv function`
          }
          break
        default:
          answer.convResult = `unknown convType ${convType}`
          break
      }
    }
    answer.result =
      answer.convResult !== undefined
        ? answer.convResult
        : answer.jsonPathResult !== undefined
          ? answer.jsonPathResult
          : answer.restQueryResult
    // console.log(`triggerRestQueryDetails got result='${JSON.stringify(answer.result)}'`);
  } catch (e) {
    console.log(`triggerRestQueryDetails got error=`, e)
    answer.error = e && e.errors && Array.isArray(e.errors) ? e.errors.join(' / ') : `unknown error:'${JSON.stringify(e)}'`
  }
  return answer
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
  if (typeof a !== typeof b) return false
  const objAKeys = Object.keys(a)
  if (objAKeys.length !== Object.keys(b).length) return false
  let eq = true
  for (let i = 0; eq && i < objAKeys.length; ++i) {
    const key = objAKeys[i]
    eq = a[key] === b[key]
  }
  // console.log(`objectShallowEq eq=${eq} `, a, b);
  return eq
}

/**
 * If data is a number and the number is >max return max+.
 * Helper function for badge max mimic
 * @param {string|number} data
 * @param {number} max
 * @returns data or if data>max "max+"
 */
export function numberAbbrev(data, max) {
  // console.warn(`numberAbbrev(${data}, ${max}), typeof data=${typeof data} data>max=${data > max}`)
  if (typeof data === 'number' && data > max) {
    return `${max}+`
  }
  return data
}

// array of [eventType:String, handler(event):bool]
export const customEventStack = []
