/**
 * copyright (c) 2020 - 2023, Matthias Behr
 *
 * todo:
 * change to "request-light" (npm i request-light) for https requests
 * - add nonce/random ids to each element? (for smaller edits/updates)
 */

import * as path from 'path'
import * as fs from 'fs'
import * as vscode from 'vscode'
import { getNonce, performHttpRequest } from './util'
import { TelemetryReporter } from '@vscode/extension-telemetry'
import ShortUniqueId from 'short-unique-id'
import { FBAFSProvider } from './fbaFSProvider'
import { FBANotebookProvider } from './fbaNotebookProvider'
import { currentFBAFileVersion, fbaToString, fbaYamlFromText, Fishbone, getFBDataFromText } from './fbaFormat'
import { getAttributeFromFba, RQ, rqUriEncode } from 'dlt-logs-utils/restQuery'
import * as JSON5 from 'json5'
import { FBAIProvider } from './fbAIProvider'

const uid = new ShortUniqueId.default({ length: 8 })

interface AssetManifest {
  files: {
    'main.js': string
    'main.css': string
    'runtime-main.js': string
    [key: string]: string
  }
}

export interface DocData {
  log: vscode.LogOutputChannel
  webviewPanel: vscode.WebviewPanel
  gotAliveFromPanel: boolean
  msgsToPost: any[]
  lastPostedDocVersion: number
  lastPostedObj?: Fishbone // any
  editsPending: {
    document: vscode.TextDocument // the document to update
    docVersion: number // the document version at the time the update was queued
    toChangeObj: any // the object with the changes to apply. can be just a few fields
  }[]
  treeItem?: FishboneTreeItem
  fbaFsAuthority?: string
}

export interface FishboneTreeItem extends vscode.TreeItem {
  id?: string
  label?: string | vscode.TreeItemLabel
  tooltip?: string | vscode.MarkdownString
  description?: string | boolean
  contextValue?: string
  iconPath?: string | vscode.IconPath

  parent?: FishboneTreeItem
  children: FishboneTreeItem[]

  // collapsibleState?

  docData?: DocData
  _document?: vscode.TextDocument
}

/**
 *
 */
export class FBAEditorProvider implements vscode.CustomTextEditorProvider, vscode.Disposable {
  public static register(log: vscode.LogOutputChannel, context: vscode.ExtensionContext, reporter?: TelemetryReporter): FBAEditorProvider {
    const provider = new FBAEditorProvider(log, context, reporter)
    context.subscriptions.push(
      vscode.window.registerCustomEditorProvider(FBAEditorProvider.viewType, provider, {
        webviewOptions: { retainContextWhenHidden: true },
      }),
    )
    context.subscriptions.push(vscode.workspace.registerFileSystemProvider(FBAEditorProvider.fsSchema, provider._fsProvider))
    context.subscriptions.push(new FBANotebookProvider(log, context, provider, provider._fsProvider))
    // does not work in CustomTextEditor (only in text view) context.subscriptions.push(vscode.languages.registerDocumentDropEditProvider({ pattern: '**/*.fba' }, provider));
    context.subscriptions.push(new FBAIProvider(log, context, provider, reporter))
    return provider;
  }

  private static readonly viewType = 'fishbone.fba' // has to match the package.json
  private static readonly treeViewType = 'fishbone_tree.fba' // has to match as well
  private static readonly fsSchema = 'fbaFs'

  // explorer tree view support:
  private _treeView?: vscode.TreeView<FishboneTreeItem>
  private _onDidChangeTreeData: vscode.EventEmitter<FishboneTreeItem | null> = new vscode.EventEmitter<FishboneTreeItem | null>()
  public _treeRootNodes: FishboneTreeItem[] = []

  private _subscriptions: Array<vscode.Disposable> = new Array<vscode.Disposable>()

  /// some extensions might offer a rest api (currently only dlt-logs), store ext name and function here
  private _restQueryExtFunctions: Map<string, Function> = new Map<string, Function>()
  private _extensionSubscriptions: vscode.Disposable[] = []
  private _checkExtensionsTimer?: NodeJS.Timeout = undefined
  private _checkExtensionsLastActive = 0
  // last active rest query document
  public _lastActiveRestQueryDoc: { ext: string; uri?: string } = { ext: '' }

  private _fsProvider: FBAFSProvider

  constructor(
    private log: vscode.LogOutputChannel,
    private readonly context: vscode.ExtensionContext,
    private readonly reporter?: TelemetryReporter,
  ) {
    log.debug(`FBAEditorProvider constructor() called...`)

    this._fsProvider = new FBAFSProvider(this)

    // time-sync feature: check other extensions for api onDidChangeSelectedTime and connect to them.
    this._subscriptions.push(
      vscode.extensions.onDidChange(() => {
        setTimeout(() => {
          log.debug(`fishbone.extensions.onDidChange #ext=${vscode.extensions.all.length}`)
          this.checkActiveExtensions()
        }, 1500)
      }),
    )
    this._checkExtensionsTimer = setInterval(() => {
      this.checkActiveExtensions()
    }, 1000)
    /* setTimeout(() => {
            this.checkActiveExtensions();
        }, 2000); todo renable one the onDidChange works reliable... */

    // Tree view
    const _treeRootNodes = this._treeRootNodes
    const _postMsgOnceAlive = this.postMsgOnceAlive
    this._treeView = vscode.window.createTreeView(FBAEditorProvider.treeViewType, {
      treeDataProvider: {
        onDidChangeTreeData: this._onDidChangeTreeData.event,
        getTreeItem(e: FishboneTreeItem): vscode.TreeItem {
          return e
        },
        getParent(e: FishboneTreeItem) {
          return e.parent
        },
        getChildren(e?: FishboneTreeItem) {
          if (!e) {
            return _treeRootNodes
          } else {
            return e.children
          }
        },
      },
      dragAndDropController: {
        dragMimeTypes: [], // ['text/uri-list'],
        dropMimeTypes: ['application/vnd.code.tree.dltlifecycleexplorer', 'application/vnd.dlt-logs+json', 'text/uri-list'],
        async handleDrop(
          target: FishboneTreeItem | undefined,
          sources: vscode.DataTransfer,
          token: vscode.CancellationToken,
        ): Promise<void> {
          let srcs: string[] = []
          let valuePromises: Thenable<String>[] = []
          sources.forEach((item, mimeType) => valuePromises.push(item.asString()))
          let values = await Promise.all(valuePromises)
          sources.forEach((item, mimeType) => srcs.push(mimeType))
          log.info(`FBAEditorProvider.handleDrop on target:'${target?.label}'`)
          if (target && target.docData) {
            let item = sources.get('application/vnd.dlt-logs+json')
            if (item !== undefined) {
              const docData = target.docData
              item.asString().then((value) => {
                log.info(`FBAEditorProvider.handleDrop sending value:'${value}'`)
                _postMsgOnceAlive(docData, {
                  type: 'CustomEvent',
                  eventType: 'ext:drop',
                  detail: { mimeType: 'application/vnd.dlt-logs+json', values: JSON5.parse(value) },
                })
              })
            }
          }
        },
      },
    })
  }

  private _onDidChangeActiveRestQueryDoc = new vscode.EventEmitter<{ ext: string; uri: vscode.Uri | undefined }>()
  private _lastRestQueryDocEvent: { ext: string; uri: vscode.Uri | undefined } | undefined
  /**
   * event that get triggered if any active restquery (currently only dlt) doc
   * (the dlt doc that can be referenced with /get/docs/0/...) changes.
   * The event gets debounced a bit to prevent lots of traffic after switching documents.
   */
  get onDidChangeActiveRestQueryDoc(): vscode.Event<{ ext: string; uri: vscode.Uri | undefined }> {
    return (listener: (e: { ext: string; uri: vscode.Uri | undefined }) => any, thisArgs?: any, disposables?: vscode.Disposable[]) => {
      setImmediate(() => {
        if (this._lastRestQueryDocEvent) {
          // Fire the last event immediately if one subscribes and we already have an event
          listener.call(thisArgs, this._lastRestQueryDocEvent)
        }
      })
      return this._onDidChangeActiveRestQueryDoc.event(listener, thisArgs, disposables)
    }
  }

  dispose() {
    this.log.debug(`FBAEditorProvider dispose() called...`)

    if (this._checkExtensionsTimer) {
      clearInterval(this._checkExtensionsTimer)
      this._checkExtensionsTimer = undefined
    }

    this._subscriptions.forEach((value) => {
      if (value !== undefined) {
        value.dispose()
      }
    })
  }

  /* doesn't work yet with CustomTextEditor
    public provideDocumentDropEdits(document: vscode.TextDocument, position: vscode.Position, dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): vscode.ProviderResult<vscode.DocumentDropEdit> {
        console.warn(`FBAEditorProvider.provideDocumentDropEdits(...)...`);
        return undefined;
    } */

  async checkActiveExtensions() {
    const log = this.log
    // we debounce and react only if the number of active extensions changes:
    let nrActiveExt = vscode.extensions.all.reduce((acc, cur) => acc + (cur.isActive ? 1 : 0), 0)
    if (nrActiveExt !== this._checkExtensionsLastActive) {
      this._checkExtensionsLastActive = nrActiveExt

      this._extensionSubscriptions.forEach((v) => v?.dispose())
      this._extensionSubscriptions = []

      this._restQueryExtFunctions.clear()
      let newRQs = new Map<string, Function>()
      let newSubs = new Array<vscode.Disposable>()

      // check in parallel but wait:
      await Promise.all(
        vscode.extensions.all.map(async (value) => {
          if (value.isActive) {
            // console.log(`dlt-log:found active extension: id=${value.id}`);// with #exports=${value.exports.length}`);
            try {
              let importedApi = value.exports
              if (importedApi !== undefined) {
                let subscr = importedApi.restQuery
                if (subscr !== undefined) {
                  log.debug(`fishbone.got restQuery api from ${value.id}`)
                  // testing it:
                  let versResp = subscr('/get/version')
                  // string | Thenable<string> = rq(query); // restQuery can return a string or a Promise<string>
                  if (versResp !== undefined && typeof versResp !== 'string') {
                    versResp = (await versResp) as string
                  }
                  log.debug(`fishbone restQuery('/get/version')=${versResp}`)
                  {
                    // add some version checks:
                    const versObj = JSON5.parse(versResp)
                    if ('data' in versObj && versObj['data'].type === 'version') {
                      const versAttrs = versObj['data'].attributes
                      if (versAttrs && 'name' in versAttrs) {
                        switch (versAttrs.name) {
                          case 'mbehr1.dlt-logs':
                            // if the version is too small ask to update.
                            // we do req. at leat 1.2.1 for restQuery to work properly: (uri de/encode params)
                            // todo use some semver version compare lib.
                            const version: string = typeof versAttrs.version === 'string' ? versAttrs.version : ''
                            const versions = version.split('.').map((e) => Number(e))
                            if (versions.length === 3) {
                              if (
                                versions[0] < 1 || // 0.x.y
                                (versions[0] === 1 && versions[1] < 3) || // 1.<3.x
                                (versions[0] === 1 && versions[1] === 3 && versions[2] < 0)
                              ) {
                                // 1.3.<0
                                // it gets shown multiple times as the extensions are checked multiple times.
                                // but lets keep it like that to get more attention ;-)
                                vscode.window.showWarningMessage(`Please update your DLT-Logs extension to at least version 1.3.0!`)
                              }
                            }
                            break
                          default:
                            break
                        }
                      }
                    }
                  }
                  newRQs.set(value.id, subscr)
                }
                let fnOnDidChangeActiveRestQueryDoc = importedApi.onDidChangeActiveRestQueryDoc
                if (fnOnDidChangeActiveRestQueryDoc !== undefined) {
                  let extId = value.id
                  let subOnDidChange = fnOnDidChangeActiveRestQueryDoc(async (uri: vscode.Uri | undefined) => {
                    log.info(`extension ${extId} onDidChangeActiveRestQueryDoc: uri=${uri?.toString()}`)
                    this._lastRestQueryDocEvent = { ext: extId, uri: uri }
                    this._onDidChangeActiveRestQueryDoc.fire(this._lastRestQueryDocEvent)
                  })
                  if (subOnDidChange !== undefined) {
                    newSubs.push(subOnDidChange)
                  }
                }
              }
            } catch (error: any) {
              log.debug(`extension ${value.id} throws: ${error.name}:${error.message}`)
            }
          }
        }),
      )
      this._restQueryExtFunctions = newRQs
      this._extensionSubscriptions = newSubs
      log.debug(
        `checkActiveExtensions: got ${this._restQueryExtFunctions.size} rest query functions and ${this._extensionSubscriptions.length} subscriptions.`,
      )
    } else {
      // console.log(`fishbone.checkActiveExtensions: nrActiveExt = ${nrActiveExt}`);
    }
  }

  private postMsgOnceAlive(docData: DocData, msg: any) {
    const log = this.log
    if (docData.gotAliveFromPanel) {
      // send instantly
      const msgCmd = msg.command
      /* eslint-disable semi */
      docData.webviewPanel.webview.postMessage(msg).then(
        (fullFilled: boolean) => {
          if (!fullFilled) {
            log.warn(`FBAEditorProvider.postMessage(...) direct not fullFilled ${fullFilled}`)
          }
        },
        (rejectReason: any) => {
          log.warn(`FBAEditorProvider.postMessage(...) direct rejected with ${rejectReason}`)
        },
      )
      /* eslint-enable semi */
    } else {
      docData.msgsToPost.push(msg)
    }
  }

  private updateWebview(docData: DocData, document: vscode.TextDocument) {
    const log = this.log
    if (docData.lastPostedDocVersion !== document.version) {
      log.debug(
        `FBAEditorProvider updateWebview posting to webview(visible=${docData.webviewPanel.visible}, active=${docData.webviewPanel.active}): lastPostedDocVersion=${docData.lastPostedDocVersion}, new docVersion=${document.version}`,
      )
      const docObj: any = FBAEditorProvider.getFBDataFromDoc(docData, document)
      // we use the fba-fs authority to reference this document uri
      // as the fbUids are only unique within one document. But as the documents
      // can be easily copied and then changed there will be duplicate fbUids.

      // The authority component is preceded by a double slash ("//") and is
      // terminated by the next slash ("/"), question mark ("?"), or number
      // sign ("#") character, or by the end of the URI.
      // could use a compressed version: zlib.deflateSync(text).toString('base64')
      // but would need caching
      // and authority seems to be lower case only...
      // so we cannot use base64 but base16 (hex) (base32 or 36 might work as well)

      // use-cases to support: (with an open document)
      // [x] - save as -> change name
      // [] - rename file (not tested yet)

      const fbaFsAuthority = docData.fbaFsAuthority
        ? docData.fbaFsAuthority
        : (docData.fbaFsAuthority = Buffer.from(document.uri.toString()).toString(
            'hex',
          )) /*BigInt(`0x${Buffer.from(document.uri.toString()).toString('hex')}`).toString(32))*/

      this.postMsgOnceAlive(docData, {
        type: 'update',
        fbaFsAuthority,
        data: docObj.fishbone,
        title: docObj.title,
        attributes: docObj.attributes,
      })
      docData.lastPostedObj = docObj
      docData.lastPostedDocVersion = document.version

      if (docData.treeItem && docData.treeItem.label !== docObj.title) {
        docData.treeItem.label = docObj.title
        this._onDidChangeTreeData.fire(docData.treeItem)
      }
    } else {
      log.debug(`FBAEditorProvider updateWebview skipped as version already posted.(lastPostedDocVersion=${docData.lastPostedDocVersion}`)
    }
  }

  /**
   * Called when our custom editor is opened.
   */
  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    const log = this.log
    // console.log(`FBAEditorProvider.resolveCustomTextEditor(document.uri=${document.uri}})`)
    this.reporter?.sendTelemetryEvent('resolveCustomTextEditor', undefined, { lineCount: document.lineCount })

    // Setup initial content for the webview
    webviewPanel.webview.options = {
      enableScripts: true,
      enableCommandUris: true,
    }
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview)

    // the panel can only receive data once fully loaded.
    // So we do wait for the panel to send an alive
    // then we'll send our data:

    let docData: DocData = {
      log,
      webviewPanel: webviewPanel,
      gotAliveFromPanel: false,
      msgsToPost: [],
      lastPostedDocVersion: document.version - 1, // we want one update
      editsPending: [],
    }
    docData.treeItem = {
      docData: docData,
      _document: document,
      children: [],
      label: document.uri.path,
      tooltip: 'Drop filters here to use them in edit dialogs for badges and "apply filter".',
    }

    this._treeRootNodes.push(docData.treeItem)
    this._onDidChangeTreeData.fire(null)

    // Hook up event handlers so that we can synchronize the webview with the text document.
    //
    // The text document acts as our model, so we have to sync change in the document to our
    // editor and sync changes in the editor back to the document.
    //
    // Remember that a single text document can also be shared between multiple custom
    // editors (this happens for example when you split a custom editor)

    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() === document.uri.toString()) {
        // this is called when either the text changes due to edits
        // but as well when e.g. the dirty flag changes.
        log.debug(
          `FBAEditorProvider onDidChangeTextDocument isDirty=${e.document.isDirty} isClosed=${e.document.isClosed} version=${e.document.version}/${document.version}  doc.lineCount=${e.document.lineCount} e.contentChanges.length=${e.contentChanges.length}`,
          e.contentChanges.map((e) => JSON.stringify({ rl: e.rangeLength, tl: e.text.length })).join(','),
        )
        // skip update if there are no content changes? (.length=0?) -> done inside updateWebview based on version
        // todo: we can even skip update if its triggered by changes from the webview...
        this.updateWebview(docData, document)
        if (docData.treeItem) {
          this._fsProvider.onFbaDocChanges(docData.treeItem)
        }
      } else if (e.document === document) {
        log.warn(
          `FBAEditorProvider onDidChangeTextDocument: document.uri changed: ${document.uri.toString()} -> e.document=${e.document.uri.toString()}`,
        )
      }
    })

    /*
    const didSaveDocumentSubscription = vscode.workspace.onDidSaveTextDocument((eventDoc) => {
      console.log(`FBAEditorProvider onDidSaveTextDocument: ${document.uri.toString()} ${eventDoc.uri.toString()}`)
      // we use it only to see whether we have been saved with a new name.
      if (eventDoc.uri.toString() === document.uri.toString()) {
        return
      }

      // sadly we cannot compare the document objects... weird...
      for (const openDoc of vscode.workspace.textDocuments) {
        if (openDoc.uri.toString() === document.uri.toString()) {
          // still exists... break
          console.log(`FBAEditorProvider onDidSaveTextDocument: found ours openDoc=${openDoc.uri.toString()} isClosed=${openDoc.isClosed}`)
          return
        }
      }
      // doesn't seem to work as on "save as..." we get
      // didSaveTextDocument with the new document.uri but the document object is different
      // the old/prev. text document does still exist and is reported as open/!isClosed
      // the onDidClose is called a long time (>~30s) after the onDidSaveTextDocument
      // but the webviewPanel.onDispose is called directly after

      // if we end here we seem to have been saved with a new name.
      console.warn(`FBAEditorProvider onDidSaveTextDocument: document was saved with a new name: ${eventDoc.uri.toString()}`)
    })

    const didCloseDocumentSubscription = vscode.workspace.onDidCloseTextDocument((eventDoc) => {
      //if (eventDoc === document) {
      console.log(`FBAEditorProvider onDidCloseTextDocument: ${document.uri.toString()} ${eventDoc.uri.toString()}`)
      // }
    }) */

    const changeActiveDltDocSubscription = this.onDidChangeActiveRestQueryDoc((event) => {
      if (docData.webviewPanel.visible) {
        this.postMsgOnceAlive(docData, {
          type: 'onDidChangeActiveRestQueryDoc',
          ext: event.ext,
          uri: event.uri?.toString(),
        })
        log.info(
          `FBAEditorProvider onDidChangeActiveRestQueryDoc: webviewPanel visible, posting last active rest query doc: ext=${
            event.ext
          } uri=${event.uri?.toString()}`,
        )

        this._lastActiveRestQueryDoc.ext = '' // marker to not send it if it becomes visible
      } else {
        log.info(
          `FBAEditorProvider onDidChangeActiveRestQueryDoc: webviewPanel not visible, storing last active rest query doc: ext=${
            event.ext
          } uri=${event.uri?.toString()}`,
        )
        // we store the last one and send it if the webview becomes visible
        this._lastActiveRestQueryDoc.ext = event.ext
      }
      this._lastActiveRestQueryDoc.uri = event.uri?.toString()
    })

    const changeViewStateSubsription = webviewPanel.onDidChangeViewState((e) => {
      try {
        /*console.log(
          `FBAEditorProvider webview(${document.uri.toString()}) onDidChangeViewState(active=${e.webviewPanel.active} visible=${
            e.webviewPanel.visible
          })...`,
        )*/
        if (e.webviewPanel.active && e.webviewPanel.visible) {
          if (this._lastActiveRestQueryDoc.ext.length > 0) {
            /*console.log(
              `FBAEditorProvider webview(${document.uri.toString()}) delayed onDidChangeActiveRestQueryDoc(ext='${
                lastActiveRestQueryDoc.ext
              }' uri=${lastActiveRestQueryDoc.uri})`,
            )*/
            this.postMsgOnceAlive(docData, {
              type: 'onDidChangeActiveRestQueryDoc',
              ext: this._lastActiveRestQueryDoc.ext,
              uri: this._lastActiveRestQueryDoc.uri,
            })
            this._lastActiveRestQueryDoc.ext = ''
          }
        }
      } catch (e) {
        log.error(`FBAEditorProvider webview.onDidChangeViewState got e=${e}`)
      }
    }, this)

    const changeThemeSubscription = vscode.window.onDidChangeActiveColorTheme((event) => {
      this.postMsgOnceAlive(docData, {
        type: 'onDidChangeActiveColorTheme',
        kind: event.kind, // 1 = light, 2 = dark, 3 = high contrast
      })
    })

    // Make sure we get rid of the listener when our editor is closed.
    webviewPanel.onDidDispose(() => {
      // console.log(`FBAEditorProvider webview(${document.uri.toString()}) onDidDispose()...`)
      changeViewStateSubsription.dispose()
      changeDocumentSubscription.dispose()
      // didSaveDocumentSubscription.dispose()
      // didCloseDocumentSubscription.dispose()
      changeThemeSubscription.dispose()
      changeActiveDltDocSubscription.dispose()

      let itemIdx = this._treeRootNodes.findIndex((item) => item.docData?.webviewPanel === webviewPanel)
      if (itemIdx >= 0) {
        const removed = this._treeRootNodes.splice(itemIdx, 1)
        this._onDidChangeTreeData.fire(null)
        removed.forEach((item) => {
          // we change the lastPostedObj to an empty obj to indicate that it's not existing now
          if (item.docData) {
            item.docData.lastPostedObj = {
              title: '',
              attributes: [],
              fishbone: [],
            }
          }
          this._fsProvider.onFbaDocChanges(item)
        })
      }
    })

    // Receive message from the webview.

    webviewPanel.webview.onDidReceiveMessage(async (e) => {
      docData.gotAliveFromPanel = true
      // any messages to post?
      if (docData.msgsToPost.length) {
        let msg: any
        while ((msg = docData.msgsToPost.shift())) {
          // keep fifo order
          const msgCmd = JSON.stringify(msg)
          docData.webviewPanel.webview.postMessage(msg) /*.then((onFulFilled) => {
                        console.log(`WebsharkView.postMessage(${msgCmd}) queued ${onFulFilled}`);
                    });*/
        }
      }

      switch (e.type) {
        case 'update':
          try {
            FBAEditorProvider.updateTextDocument(docData, document, { fishbone: e.data, title: e.title, attributes: e.attributes })

            // lets do two quick changes: was used to test race condition from issue #7
            // setTimeout(() =>
            //    FBAEditorProvider.updateTextDocument(docData, document, { fishbone: e.data, title: e.title, attributes: e.attributes }), 1);
          } catch (e: any) {
            log.error(
              `Fishbone: Could not update document. Changes are lost. Please consider closing and reopening the doc. Error= ${e.name}:${e.message}.`,
            )
            vscode.window.showErrorMessage(
              `Fishbone: Could not update document. Changes are lost. Please consider closing and reopening the doc. Error= ${e.name}:${e.message}.`,
            )
          }
          break
        case 'sAr':
          {
            // vscode.postMessage({ type: 'sAr', req: req, id: reqId });
            // console.log(`fbaEditor got sAr msg(id=${e.id}}): ${JSON.stringify(e.req)}`);
            switch (e.req.type) {
              case 'restQuery':
                {
                  // {"type":"restQuery","request":"ext:dlt-logs/get/sw-versions"}
                  const url: string = typeof e.req.request === 'string' ? e.req.request : e.req.request.url // todo request.url should not occur any longer!
                  this.performRestQueryUri(url).then(
                    (resJson) => {
                      webviewPanel.webview.postMessage({ type: e.type, res: resJson, id: e.id })
                    },
                    (txtError: string) => {
                      webviewPanel.webview.postMessage({
                        type: e.type,
                        res: { errors: [txtError] },
                        id: e.id,
                      })
                    },
                  )
                }
                break
              default:
                log.warn(`fbaEditor got unknown sAr type '${e.req.type}'`)
                webviewPanel.webview.postMessage({ type: e.type, res: { errors: [`unknown sAr type '${e.req.type}'`] }, id: e.id })
                break
            }
          }
          break
        case 'log':
          log.info(e.message)
          return
        default:
          log.warn(`FBAEditorProvider.onDidReceiveMessage unexpected message (e.type=${e.type}): e=${JSON.stringify(e)}`)
          break
      }
    })

    // send initial data
    this.updateWebview(docData, document)
  }

  /**
   * Perform a rest query.
   *
   * This will replace ${attributes.<attribute>} with the value of the attribute for
   * the commands 'query' and 'report' in the rq.commands array. But only for direct members
   * of the filter objects in the array.
   *
   * Attributes in the form ${attributes.<attribute>.<member>} or ${attributes.<attribute>} are supported.
   * Attributes will be replaced by the value of the attribute if its a string/number or an array of strings/numbers.
   *
   * Undefined attributes will be removed from the filter object. This is different to the restQuery from
   * utils.js where the attributes are e.g. replaced with null values.
   * @param docData
   * @param rq
   * @returns
   */
  public performRestQuery(docData: DocData, rq: RQ): Promise<any> {
    //console.warn(`performRestQuery: got ext query for extName='${rq.path}' #commands='${rq.commands.length}'`)

    // search for filters and replace ${attribute.ecu} with the value of the attribute
    for (const cmd of rq.commands) {
      switch (cmd.cmd) {
        case 'report':
        case 'query':
          {
            const param = JSON5.parse(cmd.param)
            if (this.substFilterAttributes(docData, param)) {
              cmd.param = JSON.stringify(param)
            }
          }
          break
      }
    }
    return this.performRestQueryUri(rqUriEncode(rq))
  }

  /**
   * substitute/replace attributes of filters in place
   * @param filters array of filterFrags i.e. object with filter attributes
   * @returns true if any attribute was replaced
   */
  public substFilterAttributes(docData: DocData, filters: any[]) {
    const log = this.log

    // attribute support:
    const attrCache = new Map<string, string | number | (string | number)[] | undefined>()
    const getAttribute = (attribute: string): string | number | (string | number)[] | undefined => {
      // check if we already have the attribute in the cache
      if (attrCache.has(attribute)) {
        return attrCache.get(attribute)
      }
      // console.log(`getAttribute(${attribute})...`)
      return docData.lastPostedObj && docData.lastPostedObj.attributes
        ? getAttributeFromFba(docData.lastPostedObj.attributes, attribute)
        : undefined
    }

    if (Array.isArray(filters)) {
      let didChange = false
      for (const filter of filters) {
        Object.keys(filter).forEach((key) => {
          if (typeof filter[key] === 'string' && filter[key].startsWith('${attributes.')) {
            // console.warn(`performRestQuery: got key: '${key}' with attribute '${filter[key]}'`)
            const attribute = filter[key].slice(13, -1) // remove ${attributes. and }
            const attrVal = getAttribute(attribute)
            log.info(`FBAEditorProvider.substFilterAttributes: got attribute '${attribute}' with value: ${JSON.stringify(attrVal)}`)
            if (attrVal !== undefined) {
              filter[key] = attrVal
            } else {
              // remove key:
              delete filter[key]
            }
            didChange = true
          }
        })
      }
      return didChange
    }
  }

  /**
   * perform rest query via an uri.
   *
   * Does not perform the ${attributes.<attribute>} replacement.
   * @param docData
   * @param url
   * @returns
   */
  public performRestQueryUri(url: string): Promise<any> {
    const log = this.log
    if (url.startsWith('ext:')) {
      const extName = url.slice(4, url.indexOf('/'))
      const query = url.slice(url.indexOf('/'))
      // console.warn(`performRestQueryUri: got ext query for extName='${extName}' query='${query}'`)
      // did this extension offer the restQuery?
      return new Promise((resolve, reject) => {
        const rq = this._restQueryExtFunctions.get(extName)
        if (rq) {
          // call it:
          let res: string | Thenable<string> = rq(query) // restQuery can return a string or a Promise<string>
          if (typeof res !== 'string') {
            res.then((value) => {
              const asJson = JSON5.parse(value)
              resolve(asJson)
            })
          } else {
            const asJson = JSON5.parse(res)
            resolve(asJson)
          }
        } else {
          reject(`extName '${extName}' does not offer restQuery (yet?)`)
        }
      })
    } else {
      return new Promise((resolve, reject) => {
        // console.log(`triggerRestQuery triggering ${JSON.stringify(e.req.request)} via request`);

        performHttpRequest(this.context.globalState, url, { Accept: 'application/json' })
          .then((result: any) => {
            if (true /* result.res.statusCode !== 200 */) {
              log.debug(`request ${JSON.stringify(url)} got statusCode=${result.res.statusCode}`)
            }
            if ('headers' in result.res && 'content-type' in result.res.headers) {
              const contentType = result.res.headers['content-type']
              // warn if header is not application/json: e.g.
              // "content-type": "application/json; charset=utf-8",
              //console.log(`request statusCode=${result.res.statusCode} content-type='${contentType}'`);
              if (typeof contentType === 'string' && !contentType.includes('pplication/json')) {
                log.warn(`triggerRestQuery '${JSON.stringify(url)}' returned wrong content-type : '${contentType}'`)
                log.warn(` body first 2000 chars='${result.body.slice(0, 2000)}'`)
              }
            }
            const json = JSON5.parse(result.body)
            resolve(json)
          })
          .catch((err) => {
            reject(`request failed with err=${err.name}:${err.message}`)
          })
      })
    }
  }

  /**
   * Get the static html used for the editor webviews.
   */

  private getHtmlForWebview(webview: vscode.Webview): string {
    const webviewPath: string = path.join(this.context.extensionPath, 'out', 'webview')
    const assetManifest: AssetManifest = require(path.join(webviewPath, 'asset-manifest.json'))

    const main: string = assetManifest.files['main.js']
    const styles: string = assetManifest.files['main.css']

    const mainUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview', main))
    const stylesUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview', styles))

    // Use a nonce to whitelist which scripts can be run
    const nonce = getNonce()
    // todo 				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

    const initialData: any[] = []
    const initialDataStr = JSON.stringify(initialData)

    return /* html */ `
      <!DOCTYPE html>
      <html lang="en">
      <head>
                <meta charset="UTF-8">
                <meta name="theme-color" content="#000000" />

                <meta http-equiv="Content-Security-Policy"
                    content="default-src 'none';
                        img-src ${webview.cspSource} https:;
                        script-src ${webview.cspSource} 'unsafe-eval' 'unsafe-inline';
                        style-src ${webview.cspSource} 'unsafe-inline';">

        <meta name="viewport" content="width=device-width, initial-scale=0.5">

        <link href="${stylesUri.toString(true)}" rel="stylesheet" />

                <title>Fishbone Analysis</title>
      </head>
            <body>
                <noscript>You need to enable JavaScript to run this app.</noscript>
                <script nonce="${nonce}">
                    console.log('in initial script');
                    window.acquireVsCodeApi = acquireVsCodeApi;
                    window.initialData = ${initialDataStr};
                </script>
                <div id="root"></div>
                <script nonce="${nonce}" crossorigin="anonymous" src="${mainUri.toString(true)}"></script>
      </body>
      </html>`
  }

  /**
   * Update the text document with changes mainly from the webview.
   * This is an async operation so if the prev. one didn't finish yet
   * the update will be queued.
   * This allows that the edits/diffs to apply will be calculated only
   * when the prev. pending updates are applied / reflected in the
   * text document. This avoids a race-condition (see issue #7).
   * @param docData document specific data. Need editsPending from it.
   * @param document TextDocument object.
   * @param docObj Object with the changes to apply.
   */
  static updateTextDocument(docData: DocData, document: vscode.TextDocument, docObj: any) {
    // if we had already pending edits, we just queue this edit as well:
    docData.editsPending.push({ document: document, docVersion: document.version, toChangeObj: docObj })
    if (docData.editsPending.length > 1) {
      docData.log.warn(
        `FBAEditorProvider.updateTextDocument will queue edit/update. editsPending.length=${docData.editsPending.length} version=${document.version}`,
      )
      return true // we treat this ok
    }
    return FBAEditorProvider.processEditsPendingQueue(docData)
  }

  /**
   * Apply the changes from docData.editsPending one by one e.g. waiting for
   * WorkspaceEdit.applyEdit to finish before calculating the next
   * delta/edit and applying that one.
   * To do so it calls itself recursively.
   * @param docData document specific data
   */
  static async processEditsPendingQueue(docData: DocData): Promise<void> {
    const editToProcess = docData.editsPending[0]
    const document = editToProcess.document
    const docObj = editToProcess.toChangeObj
    const log = docData.log

    log.debug(`processEditsPendingQueue called with json.keys=${Object.keys(docObj)}`)

    const edit = new vscode.WorkspaceEdit()

    const prevDocText = document.getText()

    let yamlObj: any = {}
    try {
      yamlObj = fbaYamlFromText(prevDocText)
      if (typeof yamlObj !== 'object') {
        log.error('Could not get document as yaml. Content is not valid yamlObj ' + JSON.stringify(yamlObj))
        yamlObj = {}
      } else {
        // as we dont store on data file format migration (e.g. v0.3 -> v0.4) instantly
        // (to avoid a misleading "dirty file directly after opening" and non-working 'undo')
        // we notice the version mismatch here again, migrate again and use that data:
        if (yamlObj.version && yamlObj.version !== currentFBAFileVersion) {
          log.warn(`processEditsPendingQueue migrating again from ${yamlObj.version} to ${currentFBAFileVersion}:`)
          const migYamlObj = getFBDataFromText(prevDocText)
          yamlObj.version = currentFBAFileVersion
          yamlObj.attributes = migYamlObj.attributes
          yamlObj.fishbone = migYamlObj.fishbone
          yamlObj.title = migYamlObj.title
          yamlObj.backups = migYamlObj.backups
        }
      }
    } catch (e: any) {
      log.error(`Could not get document as json. Content is not valid yaml e=${e.name}:${e.message}`)
    }

    // only 'title', 'attributes' and 'fishbone' are updated for now. keep the rest:
    if ('version' in docObj) {
      yamlObj.version = docObj.version
    } else {
      yamlObj.version = currentFBAFileVersion
    }

    if ('type' in docObj) {
      yamlObj.type = docObj.type
    } else {
      if (!('type' in yamlObj)) {
        yamlObj.type = 'fba'
      }
    }
    if ('title' in docObj) {
      yamlObj.title = docObj.title
    }
    if ('attributes' in docObj && docObj.attributes !== undefined) {
      yamlObj.attributes = docObj.attributes
    }
    if ('fishbone' in docObj) {
      // special command handling to import other fishbones:
      const deepRootCausesForEach = async (fishbone: any[], parents: any[], fn: (rc: any, parents: any[]) => any | null | undefined) => {
        for (const effect of fishbone) {
          const nrCats = effect?.categories?.length
          if (nrCats > 0) {
            for (let c = 0; c < nrCats; ++c) {
              const category = effect.categories[c]
              let nrRcs = category?.rootCauses?.length
              if (nrRcs > 0) {
                for (let r = 0; r < nrRcs; ++r) {
                  const rc = category.rootCauses[r]
                  let modRc = await fn(rc, parents) // we call the callback in any case
                  if (modRc === undefined) {
                    // no change
                    modRc = rc
                  } else if (modRc === null) {
                    // delete this rc.
                    category.rootCauses.splice(r, 1)
                    --nrRcs
                    modRc = undefined
                  } else {
                    // update
                    category.rootCauses[r] = modRc
                  }
                  if (modRc !== undefined) {
                    // and if its a nested we do nest automatically:
                    if (modRc?.type === 'nested') {
                      deepRootCausesForEach(modRc.data, [...parents, modRc], fn)
                    }
                  }
                }
              }
            }
          }
        }
      }
      // check for root causes type "import" or type nested but "reimport" set:
      // we do return
      //  null: -> rc will be deleted
      //  modified obj -> will replace rc
      //  undefined -> no change
      await deepRootCausesForEach(docObj.fishbone, [], async (rc, parents) => {
        // parents use [] or [docObj] or [docObj.fishbone]for first one?
        if (rc?.type === 'import') {
          log.debug(`got 'import' rc:`, rc)
          // show open file dialog:
          const uri = await vscode.window.showOpenDialog({
            canSelectMany: false,
            filters: { Fishbone: ['fba'] },
            openLabel: 'import',
            title: 'select fishbone to import',
          })
          if (uri && uri.length === 1) {
            log.debug(` shall import '${uri[0].toString()}'`)
            // determine relative path and store for later update
            const relPath = path.relative(document.uri.fsPath, uri[0].fsPath)
            log.debug(` got relPath='${relPath}' from '${document.uri.fsPath}' and '${uri[0].fsPath}'`)
            try {
              const fileText = fs.readFileSync(uri[0].fsPath, { encoding: 'utf8' })
              const importYamlObj = getFBDataFromText(fileText)
              if (typeof importYamlObj === 'object') {
                // merge attributes (we might consider adding the new ones to the nested only and show only on entering that nested one?)
                FBAEditorProvider.mergeAttributes(yamlObj.attributes, importYamlObj.attributes)
                return {
                  fbUid: uid.randomUUID(),
                  type: 'nested',
                  relPath: relPath,
                  title: importYamlObj.title,
                  data: importYamlObj.fishbone,
                }
              }
            } catch (e: any) {
              log.error(`opening file failed with err:'${e.name}:${e.message}'`)
            }
          }
          return null // delete the import rc
        }
        // reimport?
        if (rc?.type === 'nested' && rc?.reimport) {
          if (rc.relPath) {
            log.debug(`shall 'reimport' rc.relpath=${rc?.relPath}`, rc)
            // need to get the full rel path as it's relative to the parent one which is relative to the parent one...
            const parentRelPaths = parents.map((parent) => (parent.relPath ? parent.relPath : undefined))
            let relPath = document.uri.fsPath
            for (let parentRelPath of parentRelPaths) {
              if (parentRelPath) {
                relPath = path.resolve(relPath, parentRelPath)
                log.debug(` -> relPath='${relPath}'`)
              }
            }
            relPath = path.resolve(relPath, rc.relPath)
            log.debug(` trying to reimport absPath='${relPath}'`)
            // now reimport that absPath file:
            try {
              const fileText = fs.readFileSync(relPath, { encoding: 'utf8' })
              const importYamlObj = getFBDataFromText(fileText)
              if (typeof importYamlObj === 'object') {
                // merge attributes (we might consider adding the new ones to the nested only and show only on entering that nested one?)
                FBAEditorProvider.mergeAttributes(yamlObj.attributes, importYamlObj.attributes)
                // we do have to mark any contained nested fishbones with reimport...
                await deepRootCausesForEach(importYamlObj.fishbone, [], (rc, parents) => {
                  if (rc?.type === 'nested') {
                    rc['reimport'] = true
                  }
                })
                log.debug(` reimport of '${rc.relPath}' done.`)
                return {
                  fbUid: uid.randomUUID(),
                  type: 'nested',
                  relPath: rc.relPath,
                  title: importYamlObj.title, // todo shall we keep the prev title? or append with 'was:...'?
                  data: importYamlObj.fishbone,
                }
              }
            } catch (e: any) {
              log.warn(`re-importing file '${rc.relPath}' failed due to:'${e.name}:${e.message}'`)
              vscode.window.showWarningMessage(`re-importing file '${rc.relPath} failed due to:'${e.name}:${e.message}'`)
            }
            log.debug('reimport done/failed')
          } else {
            log.error(`shall 'reimport' rc without relPath!`, rc)
          }
          delete rc.reimport // mark as done by deleting object property
          return rc // we always have to return the modified obj even if reimport failed
        }
        return undefined
      })

      yamlObj.fishbone = docObj.fishbone
    }

    // now store it as yaml:
    try {
      const yamlStr = fbaToString(yamlObj)

      if (yamlStr === prevDocText) {
        log.warn(`FBAEditorProvider.processEditsPendingQueue text unchanged! Skipping replace.`)
        // need to remove this one from the queue
        docData.editsPending.shift()
        // if there is another one in the queue: apply that one
        if (docData.editsPending.length > 0) {
          FBAEditorProvider.processEditsPendingQueue(docData)
        }
        return
      }

      // we could try to determine a "patch set". We could use e.g. the "google/diff-match-patch" lib but
      // for our use case and with yaml as the file format and the range reqs (line, col)
      // we can do a simpler approach comparing common lines at begin and end
      // todo:  benefit would be smaller edits. so most likely less memory usage.
      //  cost is more cpu to determine it. Mainly splitting the text into lines?
      //  or determining later which line/col is in range.

      edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), yamlStr)
    } catch (e: any) {
      // need to remove this one from the queue
      docData.editsPending.shift()
      log.error(`storing as YAML failed. Error=${e.name}:${e.message}`)
      vscode.window.showErrorMessage(
        `Fishbone: Could not update document. Changes are lost. Please consider closing and reopening the doc. Storing as YAML failed. Error=${e.name}:${e.message}`,
      )
      // if there is another one in the queue: apply that one
      if (docData.editsPending.length > 0) {
        FBAEditorProvider.processEditsPendingQueue(docData)
      }
      return
    }
    //console.log(`FBAEditorProvider.processEditsPendingQueue will apply edit with size=${edit.size}, editsPending.length=${docData.editsPending.length} version=${document.version}`);
    // if we call applyEdit while the prev. one is not done yet, the 2nd one will be neg. fulfilled. issue #7
    vscode.workspace.applyEdit(edit).then((fulfilled) => {
      // remove the one from queue:
      const fulFilledEdit = docData.editsPending.shift()

      if (fulfilled) {
        log.debug(
          `FBAEditorProvider.processEditsPendingQueue fulfilled (${fulFilledEdit?.docVersion}) editsPending.length=${docData.editsPending.length}`,
        )
      } else {
        // todo we could reapply here? (but avoid endless retrying...)
        log.error(`processEditsPendingQueue fulfilled=${fulfilled}`)
        vscode.window.showErrorMessage(
          `Fishbone: Could not update document. Changes are lost. Please consider closing and reopening the doc. Error=applyWorkspace !fulfilled.`,
        )
      }
      // if there is another one in the queue: apply that one
      if (docData.editsPending.length > 0) {
        FBAEditorProvider.processEditsPendingQueue(docData)
      }
    })
  }

  /**
   * parse the object data: attributes, fishbone, title from the provided
   * text that should be our yaml representation.
   * Does a version check and performs the necessary data migration on the returned object.
   * It does not return the full yaml object but only the members:
   * title, fishbone and attributes.
   * @param text yaml representation of our file format. Should contain type:'fba' and version: e.g. '0.4'
   */

  /**
   * Parse the documents content into an object.
   */
  static getFBDataFromDoc(docData: DocData, doc: vscode.TextDocument): any {
    const text = doc.getText()
    try {
      return getFBDataFromText(text)
    } catch (e: any) {
      vscode.window.showErrorMessage(`Fishbone: Could not get document as yaml. Content is not valid yaml. Error= ${e.name}:${e.message}`)
      throw new Error(`Fishbone: Could not get document as yaml. Content is not valid yaml. Error= ${e.name}:${e.message}`)
    }
    return undefined
  }

  /**
   * merge attributes from newAttrs into mainAttrs.
   * The rules are:
   *  an attribute not existing in mainAttrs will simply be added to mainAttrs
   *  an attribute already existing is ignored, even though parameters
   *  might be different!
   * @param mainAttrs
   * @param newAttrs
   */
  static mergeAttributes(mainAttrs: any[], newAttrs: any[] | undefined) {
    //console.warn(`FBAEditorProvider.mergeAttributes mainAttrs=${JSON.stringify(mainAttrs)} newAttrs=${JSON.stringify(newAttrs)}`)
    // attributes are arrays of objects with a single key (the name) (and the fbUid as 2nd key)
    if (newAttrs === undefined) {
      return
    }
    const mainKeys = mainAttrs.map((a) => {
      const { fbUid: _a, ...aWoFbUid } = a
      return Object.keys(aWoFbUid)[0]
    })
    for (const newKeyObj of newAttrs) {
      const { fbUid: _a, ...newKeyObjWoFbUid } = newKeyObj
      const newKey = Object.keys(newKeyObjWoFbUid)[0]
      if (!mainKeys.includes(newKey)) {
        mainAttrs.push(newKeyObj)
      }
    }
  }

  provideFileDecoration(uri: vscode.Uri, token: vscode.CancellationToken): vscode.FileDecoration | undefined {
    //console.warn(`FBAEditorProvider.provideFileDecoration(uri=${uri.toString()})...`)
    if (uri.toString().endsWith('.fba')) {
      //console.warn(` FBAEditorProvider.provideFileDecoration returning a test FileDecoration`)
      return {
        badge: '42', // max 2 digits
        tooltip: 'fba contains 42 errors',
        color: new vscode.ThemeColor('errorForeground'),
        propagate: true,
      }
    }
    return undefined
  }
}
