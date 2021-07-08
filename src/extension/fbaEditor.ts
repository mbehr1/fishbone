/**
 * copyright (c) 2020 - 2021, Matthias Behr
 *
 * todo:
 * change to "request-light" (npm i request-light) for https requests
 * - add nonce/random ids to each element? (for smaller edits/updates)
 */

import * as path from 'path';
import * as fs from 'fs';
import * as zlib from 'zlib';
import * as vscode from 'vscode';
import { getNonce, performHttpRequest } from './util';
import * as yaml from 'js-yaml';
import TelemetryReporter from 'vscode-extension-telemetry';

interface AssetManifest {
    files: {
        'main.js': string;
        'main.css': string;
        'runtime-main.js': string;
        [key: string]: string;
    };
}

interface DocData {
    gotAliveFromPanel: boolean;
    msgsToPost: any[];
    lastPostedDocVersion: number;
    editsPending: {
        document: vscode.TextDocument, // the document to update
        docVersion: number, // the document version at the time the update was queued
        toChangeObj: any // the object with the changes to apply. can be just a few fields
    }[];
}

const currentFBAFileVersion = '0.6';

/**
 * 
 */
export class FBAEditorProvider implements vscode.CustomTextEditorProvider, vscode.Disposable {

    public static register(context: vscode.ExtensionContext, reporter?: TelemetryReporter): void {
        const provider = new FBAEditorProvider(context, reporter);
        context.subscriptions.push(vscode.window.registerCustomEditorProvider(FBAEditorProvider.viewType, provider));

        // todo was only for testing. add later with e.g. nr errors, or unchecked ...
        // context.subscriptions.push(vscode.window.registerFileDecorationProvider(provider));
    }

    private static readonly viewType = 'fishbone.fba'; // has to match the package.json
    private _subscriptions: Array<vscode.Disposable> = new Array<vscode.Disposable>();

    /// some extensions might offer a rest api (currently only dlt-logs), store ext name and function here
    private _restQueryExtFunctions: Map<string, Function> = new Map<string, Function>();
    private _extensionSubscriptions: vscode.Disposable[] = [];
    private _checkExtensionsTimer?: NodeJS.Timeout = undefined;
    private _checkExtensionsLastActive = 0;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly reporter?: TelemetryReporter
    ) {
        console.log(`FBAEditorProvider constructor() called...`);

        // time-sync feature: check other extensions for api onDidChangeSelectedTime and connect to them.
        this._subscriptions.push(vscode.extensions.onDidChange(() => {
            setTimeout(() => {
                console.log(`fishbone.extensions.onDidChange #ext=${vscode.extensions.all.length}`);
                this.checkActiveExtensions();
            }, 1500);
        }));
        this._checkExtensionsTimer = setInterval(() => {
            this.checkActiveExtensions();
        }, 1000);
        /* setTimeout(() => {
            this.checkActiveExtensions();
        }, 2000); todo renable one the onDidChange works reliable... */

    }

    private _onDidChangeActiveRestQueryDoc = new vscode.EventEmitter<{ ext: string, uri: vscode.Uri | undefined }>();
    /**
     * event that get triggered if any active restquery (currently only dlt) doc
     * (the dlt doc that can be referenced with /get/docs/0/...) changes. 
     * The event gets debounced a bit to prevent lots of traffic after switching documents.
     */
    get onDidChangeActiveRestQueryDoc(): vscode.Event<{ ext: string, uri: vscode.Uri | undefined }> { return this._onDidChangeActiveRestQueryDoc.event; }

    dispose() {
        console.log(`FBAEditorProvider dispose() called...`);

        if (this._checkExtensionsTimer) {
            clearInterval(this._checkExtensionsTimer);
            this._checkExtensionsTimer = undefined;
        }

        this._subscriptions.forEach((value) => {
            if (value !== undefined) {
                value.dispose();
            }
        });
    }

    checkActiveExtensions() {

        // we debounce and react only if the number of active extensions changes:
        let nrActiveExt = vscode.extensions.all.reduce((acc, cur) => acc + (cur.isActive ? 1 : 0), 0);
        if (nrActiveExt !== this._checkExtensionsLastActive) {
            this._checkExtensionsLastActive = nrActiveExt;

            this._extensionSubscriptions.forEach(v => v?.dispose());
            this._extensionSubscriptions = [];

            this._restQueryExtFunctions.clear();
            let newRQs = new Map<string, Function>();
            let newSubs = new Array<vscode.Disposable>();

            vscode.extensions.all.forEach((value) => {
                if (value.isActive) {
                    // console.log(`dlt-log:found active extension: id=${value.id}`);// with #exports=${value.exports.length}`);
                    try {
                        let importedApi = value.exports;
                        if (importedApi !== undefined) {
                            let subscr = importedApi.restQuery;
                            if (subscr !== undefined) {
                                console.log(`fishbone.got restQuery api from ${value.id}`);
                                // testing it:
                                const versResp = subscr('/get/version');
                                console.log(`fishbone restQuery('/get/version')=${versResp}`);
                                { // add some version checks:
                                    const versObj = JSON.parse(versResp);
                                    if ('data' in versObj && versObj['data'].type === 'version') {
                                        const versAttrs = versObj['data'].attributes;
                                        if (versAttrs && 'name' in versAttrs) {
                                            switch (versAttrs.name) {
                                                case 'mbehr1.dlt-logs':
                                                    // if the version is too small ask to update.
                                                    // we do req. at leat 1.2.1 for restQuery to work properly: (uri de/encode params)
                                                    // todo use some semver version compare lib.
                                                    const version: string = typeof versAttrs.version === 'string' ? versAttrs.version : '';
                                                    const versions = version.split('.').map(e => Number(e));
                                                    if (versions.length === 3) {
                                                        if (versions[0] < 1 || // 0.x.y
                                                            (versions[0] === 1 && versions[1] < 3) || // 1.<3.x
                                                            (versions[0] === 1 && versions[1] === 3 && versions[2] < 0)) { // 1.3.<0
                                                            // it gets shown multiple times as the extensions are checked multiple times.
                                                            // but lets keep it like that to get more attention ;-)
                                                            vscode.window.showWarningMessage(`Please update your DLT-Logs extension to at least version 1.3.0!`);
                                                        }
                                                    }
                                                    break;
                                                default: break;
                                            }
                                        }
                                    }
                                }
                                newRQs.set(value.id, subscr);
                            }
                            let fnOnDidChangeActiveRestQueryDoc = importedApi.onDidChangeActiveRestQueryDoc;
                            if (fnOnDidChangeActiveRestQueryDoc !== undefined) {
                                let extId = value.id;
                                let subOnDidChange = fnOnDidChangeActiveRestQueryDoc(async (uri: vscode.Uri | undefined) => {
                                    this._onDidChangeActiveRestQueryDoc.fire({ ext: extId, uri: uri });
                                });
                                if (subOnDidChange !== undefined) { newSubs.push(subOnDidChange); }
                            }
                        }
                    } catch (error) {
                        console.log(`fishbone: extension ${value.id} throws: ${error.name}:${error.message}`);
                    }
                }
            });
            this._restQueryExtFunctions = newRQs;
            this._extensionSubscriptions = newSubs;
            console.log(`fishbone.checkActiveExtensions: got ${this._restQueryExtFunctions.size} rest query functions and ${this._extensionSubscriptions.length} subscriptions.`);
        } else {
            // console.log(`fishbone.checkActiveExtensions: nrActiveExt = ${nrActiveExt}`);
        }
    }

    /**
     * Called when our custom editor is opened.
     */
    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {

        this.reporter?.sendTelemetryEvent("resolveCustomTextEditor", undefined, { 'lineCount': document.lineCount });

        // Setup initial content for the webview
        webviewPanel.webview.options = {
            enableScripts: true,
        };
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

        // the panel can only receive data once fully loaded.
        // So we do wait for the panel to send an alive
        // then we'll send our data:

        let docData: DocData = {
            gotAliveFromPanel: false,
            msgsToPost: [],
            lastPostedDocVersion: document.version - 1, // we want one update
            editsPending: []
        };

        function postMsgOnceAlive(msg: any) {
            if (docData.gotAliveFromPanel) { // send instantly
                const msgCmd = msg.command;
                webviewPanel.webview.postMessage(msg); /*.then((onFulFilled) => {
                    console.log(`WebsharkView.postMessage(${msgCmd}) direct ${onFulFilled}`);
                });*/
            } else {
                docData.msgsToPost.push(msg);
            }
        };

        function updateWebview() {
            if (docData.lastPostedDocVersion !== document.version) {
                console.log(`updateWebview posting to webview: lastPostedDocVersion=${docData.lastPostedDocVersion}, new docVersion=${document.version}`);
                const docObj: any = FBAEditorProvider.getFBDataFromDoc(docData, document);

                postMsgOnceAlive({
                    type: 'update',
                    data: docObj.fishbone,
                    title: docObj.title,
                    attributes: docObj.attributes
                });
                docData.lastPostedDocVersion = document.version;
            } else {
                console.log(`updateWebview skipped as version already posted.(lastPostedDocVersion=${docData.lastPostedDocVersion}`);
            }
        }

        // Hook up event handlers so that we can synchronize the webview with the text document.
        //
        // The text document acts as our model, so we have to sync change in the document to our
        // editor and sync changes in the editor back to the document.
        // 
        // Remember that a single text document can also be shared between multiple custom
        // editors (this happens for example when you split a custom editor)

        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                // this is called when either the text changes due to edits
                // but as well when e.g. the dirty flag changes.
                console.warn(`FBAEditorProvider onDidChangeTextDocument isDirty=${e.document.isDirty} isClosed=${e.document.isClosed} version=${e.document.version}/${document.version}  doc.lineCount=${e.document.lineCount} e.contentChanges.length=${e.contentChanges.length}`, e.contentChanges.map(e => JSON.stringify({ rl: e.rangeLength, tl: e.text.length })).join(','));
                // skip update if there are no content changes? (.length=0?) -> done inside updateWebview based on version
                // todo: we can even skip update if its triggered by changes from the webview...
                updateWebview();
            }
        });

        const changeActiveDltDocSubscription = this.onDidChangeActiveRestQueryDoc((event) => {
            if (webviewPanel.visible) {
                console.log(`FBAEditorProvider webview(${document.uri.toString()}) onDidChangeActiveRestQueryDoc(ext='${event.ext}' uri=${event.uri?.toString()})...`);
                postMsgOnceAlive({
                    type: 'onDidChangeActiveRestQueryDoc',
                    ext: event.ext,
                    uri: event.uri?.toString()
                });
            }
        });

        const changeThemeSubsription = vscode.window.onDidChangeActiveColorTheme((event) => {
            postMsgOnceAlive({
                type: 'onDidChangeActiveColorTheme',
                kind: event.kind // 1 = light, 2 = dark, 3 = high contrast
            });
        });

        // Make sure we get rid of the listener when our editor is closed.
        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
            changeThemeSubsription.dispose();
            changeActiveDltDocSubscription.dispose();
        });

        // Receive message from the webview.

        webviewPanel.webview.onDidReceiveMessage(e => {
            docData.gotAliveFromPanel = true;
            // any messages to post?
            if (docData.msgsToPost.length) {
                let msg: any;
                while (msg = docData.msgsToPost.shift()) { // keep fifo order
                    const msgCmd = JSON.stringify(msg);
                    webviewPanel.webview.postMessage(msg); /*.then((onFulFilled) => {
                        console.log(`WebsharkView.postMessage(${msgCmd}) queued ${onFulFilled}`);
                    });*/
                }
            }

            switch (e.type) {
                case 'update':
                    try {
                        FBAEditorProvider.updateTextDocument(docData, document, { fishbone: e.data, title: e.title, attributes: e.attributes });

                        // lets do two quick changes: was used to test race condition from issue #7
                        // setTimeout(() =>
                        //    FBAEditorProvider.updateTextDocument(docData, document, { fishbone: e.data, title: e.title, attributes: e.attributes }), 1);

                    } catch (e) {
                        console.error(`Fishbone: Could not update document. Changes are lost. Please consider closing and reopening the doc. Error= ${e.name}:${e.message}.`);
                        vscode.window.showErrorMessage(`Fishbone: Could not update document. Changes are lost. Please consider closing and reopening the doc. Error= ${e.name}:${e.message}.`);
                    }
                    break;
                case 'sAr':
                    {  // vscode.postMessage({ type: 'sAr', req: req, id: reqId });
                        // console.log(`fbaEditor got sAr msg(id=${e.id}}): ${JSON.stringify(e.req)}`);
                        switch (e.req.type) {
                            case 'restQuery':
                                { // {"type":"restQuery","request":"ext:dlt-logs/get/sw-versions"}
                                    const url: string = typeof e.req.request === 'string' ? e.req.request : e.req.request.url; // todo request.url should not occur any longer!
                                    if (url.startsWith('ext:')) {

                                        const extName = url.slice(4, url.indexOf('/'));
                                        const query = url.slice(url.indexOf('/'));
                                        console.log(`extName=${extName} request=${url}`);
                                        // did this extension offer the restQuery?
                                        const rq = this._restQueryExtFunctions.get(extName);
                                        if (rq) {
                                            // call it:
                                            const res: string = rq(query);
                                            console.log(`FBAEditorProvider.restQuery response (first 1k chars)='${res.slice(0, 1000)}'`);
                                            // todo try/catch
                                            webviewPanel.webview.postMessage({ type: e.type, res: JSON.parse(res), id: e.id });
                                        } else {
                                            webviewPanel.webview.postMessage({ type: e.type, res: { errors: [`extName '${extName}' does not offer restQuery (yet?)`] }, id: e.id });
                                        }
                                    } else {
                                        // console.log(`triggerRestQuery triggering ${JSON.stringify(e.req.request)} via request`);

                                        performHttpRequest(this.context.globalState, url, { 'Accept': 'application/json' }).then((result: any) => {
                                            if (true /* result.res.statusCode !== 200 */) { console.log(`request ${JSON.stringify(e.req.request)} got statusCode=${result.res.statusCode}`); }
                                            if ('headers' in result.res && 'content-type' in result.res.headers) {
                                                const contentType = result.res.headers['content-type'];
                                                // warn if header is not application/json: e.g.
                                                // "content-type": "application/json; charset=utf-8",
                                                //console.log(`request statusCode=${result.res.statusCode} content-type='${contentType}'`);
                                                if (typeof contentType === 'string' && !contentType.includes('pplication/json')) {
                                                    console.warn(`triggerRestQuery '${JSON.stringify(e.req.request)}' returned wrong content-type : '${contentType}'`);
                                                    console.warn(` body first 2000 chars='${result.body.slice(0, 2000)}'`);
                                                }
                                            }
                                            const json = JSON.parse(result.body);
                                            webviewPanel.webview.postMessage({ type: e.type, res: json, id: e.id });
                                        }).catch(err => {
                                            webviewPanel.webview.postMessage({ type: e.type, res: { errors: [`request failed with err=${err.name}:${err.message}`] }, id: e.id });
                                        });
                                    }
                                }
                                break;
                            default:
                                console.warn(`fbaEditor got unknown sAr type '${e.req.type}'`);
                                webviewPanel.webview.postMessage({ type: e.type, res: { errors: [`unknown sAr type '${e.req.type}'`] }, id: e.id });
                                break;
                        }
                    }
                    break;
                case 'log':
                    console.log(e.message);
                    return;
                default:
                    console.warn(`FBAEditorProvider.onDidReceiveMessage unexpected message (e.type=${e.type}): e=${JSON.stringify(e)}`);
                    break;
            }
        });

        // send initial data
        updateWebview();
    }

    /**
     * Get the static html used for the editor webviews.
     */

    private getHtmlForWebview(webview: vscode.Webview): string {

        const webviewPath: string = path.join(this.context.extensionPath, 'out', 'webview');
        const assetManifest: AssetManifest = require(path.join(webviewPath, 'asset-manifest.json'));

        const main: string = assetManifest.files['main.js'];
        const styles: string = assetManifest.files['main.css'];
        const runTime: string = assetManifest.files['runtime-main.js'];
        const chunk: string = Object.keys(assetManifest.files).find((key) => key.endsWith('chunk.js')) as string;

        const mainUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview', main));
        const stylesUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview', styles));
        const runTimeMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview', runTime));
        const chunkUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview', chunk));

        // Use a nonce to whitelist which scripts can be run
        const nonce = getNonce();
        // todo 				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

        const initialData: any[] = [];
        const initialDataStr = JSON.stringify(initialData);

        return /* html */`
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
                <script nonce="${nonce}" crossorigin="anonymous" src="${runTimeMainUri.toString(true)}"></script>
                <script nonce="${nonce}" crossorigin="anonymous" src="${chunkUri.toString(true)}"></script>
                <script nonce="${nonce}" crossorigin="anonymous" src="${mainUri.toString(true)}"></script>
			</body>
			</html>`;
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
        docData.editsPending.push({ document: document, docVersion: document.version, toChangeObj: docObj });
        if (docData.editsPending.length > 1) {
            console.warn(`FBAEditorProvider.updateTextDocument will queue edit/update. editsPending.length=${docData.editsPending.length} version=${document.version}`);
            return true; // we treat this ok
        }
        return FBAEditorProvider.processEditsPendingQueue(docData);
    }

    /**
     * Apply the changes from docData.editsPending one by one e.g. waiting for
     * WorkspaceEdit.applyEdit to finish before calculating the next
     * delta/edit and applying that one.
     * To do so it calls itself recursively.
     * @param docData document specific data
     */
    static async processEditsPendingQueue(docData: DocData): Promise<void> {
        const editToProcess = docData.editsPending[0];
        const document = editToProcess.document;
        const docObj = editToProcess.toChangeObj;

        console.log(`processEditsPendingQueue called with json.keys=${Object.keys(docObj)}`);

        const edit = new vscode.WorkspaceEdit();

        const prevDocText = document.getText();

        let yamlObj: any = {};
        try {
            yamlObj = yaml.load(prevDocText, { schema: yaml.JSON_SCHEMA });
            if (typeof yamlObj !== 'object') {
                console.error('Could not get document as yaml. Content is not valid yamlObj ' + JSON.stringify(yamlObj));
                yamlObj = {};
            } else {
                // as we dont store on data file format migration (e.g. v0.3 -> v0.4) instantly
                // (to avoid a misleading "dirty file directly after opening" and non-working 'undo')
                // we notice the version mismatch here again, migrate again and use that data:
                if (yamlObj.version && yamlObj.version !== currentFBAFileVersion) {
                    console.warn(`processEditsPendingQueue migrating again from ${yamlObj.version} to ${currentFBAFileVersion}:`);
                    const migYamlObj = this.getFBDataFromText(prevDocText);
                    yamlObj.version = currentFBAFileVersion;
                    yamlObj.attributes = migYamlObj.attributes;
                    yamlObj.fishbone = migYamlObj.fishbone;
                    yamlObj.title = migYamlObj.title;
                    yamlObj.backups = migYamlObj.backups;
                }
            }
        } catch (e) {
            console.error(`Could not get document as json. Content is not valid yaml e=${e.name}:${e.message}`);
        }

        // only 'title', 'attributes' and 'fishbone' are updated for now. keep the rest:
        if ('version' in docObj) { yamlObj.version = docObj.version; } else { yamlObj.version = currentFBAFileVersion; }

        if ('type' in docObj) { yamlObj.type = docObj.type; } else {
            if (!('type' in yamlObj)) { yamlObj.type = 'fba'; }
        }
        if ('title' in docObj) { yamlObj.title = docObj.title; }
        if (('attributes' in docObj) && docObj.attributes !== undefined) { yamlObj.attributes = docObj.attributes; }
        if ('fishbone' in docObj) {
            // special command handling to import other fishbones:
            const deepRootCausesForEach = async (fishbone: any[], parents: any[], fn: (rc: any, parents: any[]) => any | null | undefined) => {
                for (const effect of fishbone) {
                    const nrCats = effect?.categories?.length;
                    if (nrCats > 0) {
                        for (let c = 0; c < nrCats; ++c) {
                            const category = effect.categories[c];
                            let nrRcs = category?.rootCauses?.length;
                            if (nrRcs > 0) {
                                for (let r = 0; r < nrRcs; ++r) {
                                    const rc = category.rootCauses[r];
                                    let modRc = await fn(rc, parents); // we call the callback in any case
                                    if (modRc === undefined) { // no change
                                        modRc = rc;
                                    } else if (modRc === null) { // delete this rc.
                                        category.rootCauses.splice(r, 1);
                                        --nrRcs;
                                        modRc = undefined;
                                    } else { // update
                                        category.rootCauses[r] = modRc;
                                    }
                                    if (modRc !== undefined) {
                                        // and if its a nested we do nest automatically:
                                        if (modRc?.type === 'nested') {
                                            deepRootCausesForEach(modRc.data, [...parents, modRc], fn);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            };
            // check for root causes type "import" or type nested but "reimport" set:
            // we do return 
            //  null: -> rc will be deleted
            //  modified obj -> will replace rc
            //  undefined -> no change
            await deepRootCausesForEach(docObj.fishbone, [], async (rc, parents) => { // parents use [] or [docObj] or [docObj.fishbone]for first one?
                if (rc?.type === 'import') {
                    console.log(`got 'import' rc:`, rc);
                    // show open file dialog:
                    const uri = await vscode.window.showOpenDialog({ canSelectMany: false, filters: { 'Fishbone': ['fba'] }, openLabel: 'import', title: 'select fishbone to import' });
                    if (uri && uri.length === 1) {
                        console.log(` shall import '${uri[0].toString()}'`);
                        // determine relative path and store for later update
                        const relPath = path.relative(document.uri.fsPath, uri[0].fsPath);
                        console.log(` got relPath='${relPath}' from '${document.uri.fsPath}' and '${uri[0].fsPath}'`);
                        try {
                            const fileText = fs.readFileSync(uri[0].fsPath, { encoding: 'utf8' });
                            const importYamlObj = FBAEditorProvider.getFBDataFromText(fileText);
                            if (typeof importYamlObj === 'object') {
                                // merge attributes (we might consider adding the new ones to the nested only and show only on entering that nested one?)
                                FBAEditorProvider.mergeAttributes(yamlObj.attributes, importYamlObj.attributes);
                                return {
                                    type: 'nested',
                                    relPath: relPath,
                                    title: importYamlObj.title,
                                    data: importYamlObj.fishbone
                                };
                            }
                        } catch (e) {
                            console.error(`opening file failed with err:'${e.name}:${e.message}'`);
                        }
                    }
                    return null; // delete the import rc
                }
                // reimport?
                if (rc?.type === 'nested' && rc?.reimport) {
                    if (rc.relPath) {
                        console.log(`shall 'reimport' rc.relpath=${rc?.relPath}`, rc);
                        // need to get the full rel path as it's relative to the parent one which is relative to the parent one...
                        const parentRelPaths = parents.map(parent => parent.relPath ? parent.relPath : undefined);
                        let relPath = document.uri.fsPath;
                        for (let parentRelPath of parentRelPaths) {
                            if (parentRelPath) {
                                relPath = path.resolve(relPath, parentRelPath);
                                console.log(` -> relPath='${relPath}'`);
                            }
                        }
                        relPath = path.resolve(relPath, rc.relPath);
                        console.log(` trying to reimport absPath='${relPath}'`);
                        // now reimport that absPath file:
                        try {
                            const fileText = fs.readFileSync(relPath, { encoding: 'utf8' });
                            const importYamlObj = FBAEditorProvider.getFBDataFromText(fileText);
                            if (typeof importYamlObj === 'object') {
                                // merge attributes (we might consider adding the new ones to the nested only and show only on entering that nested one?)
                                FBAEditorProvider.mergeAttributes(yamlObj.attributes, importYamlObj.attributes);
                                // we do have to mark any contained nested fishbones with reimport...
                                await deepRootCausesForEach(importYamlObj.fishbone, [], (rc, parents) => {
                                    if (rc?.type === 'nested') {
                                        rc['reimport'] = true;
                                    }
                                });
                                console.log(` reimport of '${rc.relPath}' done.`);
                                return {
                                    type: 'nested',
                                    relPath: rc.relPath,
                                    title: importYamlObj.title, // todo shall we keep the prev title? or append with 'was:...'?
                                    data: importYamlObj.fishbone
                                };
                            }
                        } catch (e) {
                            console.warn(`re-importing file '${rc.relPath}' failed due to:'${e.name}:${e.message}'`);
                            vscode.window.showWarningMessage(`re-importing file '${rc.relPath} failed due to:'${e.name}:${e.message}'`);
                        }
                        console.log('reimport done/failed');
                    } else {
                        console.error(`shall 'reimport' rc without relPath!`, rc);
                    }
                    delete rc.reimport; // mark as done by deleting object property
                    return rc; // we always have to return the modified obj even if reimport failed
                }
                return undefined;
            });

            yamlObj.fishbone = docObj.fishbone;
        }

        // now store it as yaml:
        try {
            const yamlStr = yaml.dump(yamlObj, { schema: yaml.JSON_SCHEMA, forceQuotes: true });

            if (yamlStr === prevDocText) {
                console.warn(`FBAEditorProvider.processEditsPendingQueue text unchanged! Skipping replace.`);
                // need to remove this one from the queue
                docData.editsPending.shift();
                // if there is another one in the queue: apply that one
                if (docData.editsPending.length > 0) {
                    FBAEditorProvider.processEditsPendingQueue(docData);
                }
                return;
            }

            // we could try to determine a "patch set". We could use e.g. the "google/diff-match-patch" lib but
            // for our use case and with yaml as the file format and the range reqs (line, col)
            // we can do a simpler approach comparing common lines at begin and end
            // todo:  benefit would be smaller edits. so most likely less memory usage.
            //  cost is more cpu to determine it. Mainly splitting the text into lines?
            //  or determining later which line/col is in range.

            edit.replace(
                document.uri,
                new vscode.Range(0, 0, document.lineCount, 0),
                yamlStr);

        } catch (e) {
            // need to remove this one from the queue
            docData.editsPending.shift();
            console.error(`storing as YAML failed. Error=${e.name}:${e.message}`);
            vscode.window.showErrorMessage(`Fishbone: Could not update document. Changes are lost. Please consider closing and reopening the doc. Storing as YAML failed. Error=${e.name}:${e.message}`);
            // if there is another one in the queue: apply that one
            if (docData.editsPending.length > 0) {
                FBAEditorProvider.processEditsPendingQueue(docData);
            }
            return;
        }
        //console.log(`FBAEditorProvider.processEditsPendingQueue will apply edit with size=${edit.size}, editsPending.length=${docData.editsPending.length} version=${document.version}`);
        // if we call applyEdit while the prev. one is not done yet, the 2nd one will be neg. fulfilled. issue #7
        vscode.workspace.applyEdit(edit).then((fulfilled) => {
            // remove the one from queue:
            const fulFilledEdit = docData.editsPending.shift();

            if (fulfilled) {
                console.log(`FBAEditorProvider.processEditsPendingQueue fulfilled (${fulFilledEdit?.docVersion}) editsPending.length=${docData.editsPending.length}`);
            } else {
                // todo we could reapply here? (but avoid endless retrying...)
                console.error(`processEditsPendingQueue fulfilled=${fulfilled}`);
                vscode.window.showErrorMessage(`Fishbone: Could not update document. Changes are lost. Please consider closing and reopening the doc. Error=applyWorkspace !fulfilled.`);
            }
            // if there is another one in the queue: apply that one
            if (docData.editsPending.length > 0) {
                FBAEditorProvider.processEditsPendingQueue(docData);
            }
        });
    }

    /**
     * parse the object data: attributes, fishbone, title from the provided
     * text that should be our yaml representation.
     * Does a version check and performs the necessary data migration on the returned object.
     * It does not return the full yaml object but only the members:
     * title, fishbone and attributes.
     * @param text yaml representation of our file format. Should contain type:'fba' and version: e.g. '0.4'
     */

    static getFBDataFromText(text: string) {
        // here we do return the data that we pass as data=... to the Fishbone

        // our document is a yaml document. 
        // representing a single object with properties:
        //  type <- expect "fba"
        //  version <- 0.4 (currentFBAFileVersion)
        //  title
        //  fishbone : array of effect objects
        //  attributes

        try {
            let yamlObj: any = undefined;
            if (text.trim().length === 0) {
                yamlObj = {
                    type: 'fba',
                    version: currentFBAFileVersion,
                    title: '<no title>',
                    fishbone: [
                        {
                            name: "<enter effect to analyse>",
                            categories: [
                                {
                                    name: 'category 1',
                                    rootCauses: []
                                }
                            ]
                        }
                    ],
                    attributes: []
                };
            } else {
                yamlObj = yaml.load(text, { schema: yaml.JSON_SCHEMA });
            }
            if (typeof yamlObj !== 'object') { throw new Error(`content is no 'object' but '${typeof yamlObj}'`); }
            console.log(`getFBDataFromText(len=${text.length}) type=${yamlObj.type}, version=${yamlObj.version}, title=${yamlObj.title}`);

            // convert data from prev. versions?
            const convertv01Effects = (effects: any) => {
                return effects.map((effectsPair: any) => {
                    return {
                        name: effectsPair[0],
                        categories: effectsPair[1].map((catPair: any) => {
                            return {
                                name: catPair[0],
                                rootCauses: catPair[1].map((rootCause: any) => {
                                    if (typeof rootCause === 'object' && rootCause.type === 'nested') {
                                        const newRootCause = { ...rootCause };
                                        newRootCause.data = convertv01Effects(rootCause.data);
                                        return newRootCause;
                                    } else {
                                        return rootCause;
                                    }
                                })
                            };
                        })
                    };
                });
            };

            // todo remove duplicate... to async version
            const deepRootCausesForEachNonAsync = (fishbone: any[], parents: any[], fn: (rc: any, parents: any[]) => any | null | undefined) => {
                for (const effect of fishbone) {
                    const nrCats = effect?.categories?.length;
                    if (nrCats > 0) {
                        for (let c = 0; c < nrCats; ++c) {
                            const category = effect.categories[c];
                            let nrRcs = category?.rootCauses?.length;
                            if (nrRcs > 0) {
                                for (let r = 0; r < nrRcs; ++r) {
                                    const rc = category.rootCauses[r];
                                    let modRc = fn(rc, parents); // we call the callback in any case
                                    if (modRc === undefined) { // no change
                                        modRc = rc;
                                    } else if (modRc === null) { // delete this rc.
                                        category.rootCauses.splice(r, 1);
                                        --nrRcs;
                                        modRc = undefined;
                                    } else { // update
                                        category.rootCauses[r] = modRc;
                                    }
                                    if (modRc !== undefined) {
                                        // and if its a nested we do nest automatically:
                                        if (modRc?.type === 'nested') {
                                            deepRootCausesForEachNonAsync(modRc.data, [...parents, modRc], fn);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            };

            // convert data from prev. version 0.2
            const convertv02TextFields = (yamlObj: { fishbone: any[], attributes: any | undefined, version: string | undefined }) => {
                // we have to modify directly the yamlObj passed: and not return a new obj.
                console.warn(`FBAEditorProvider.convertv02TextFields converting from v02 to v03 ...`);
                // update instructions, backgroundDescription and comments;
                deepRootCausesForEachNonAsync(yamlObj.fishbone, [], rootCause => {
                    // Updating fields
                    try {
                        if (rootCause.props && typeof rootCause.props.instructions === 'string') {
                            rootCause.props.instructions = { textValue: rootCause.props.instructions };
                        }
                        if (rootCause.props && typeof rootCause.props.backgroundDescription === 'string') {
                            rootCause.props.backgroundDescription = { textValue: rootCause.props.backgroundDescription };
                        }
                        if (rootCause.props && typeof rootCause.props.comments === 'string') {
                            rootCause.props.comments = { textValue: rootCause.props.comments };
                        }
                        return rootCause;
                    } catch (e) {
                        console.warn(` FBAEditorProvider.convertv02TextFields got error ${e.type}:${e.message} migrating ${JSON.stringify(rootCause)}`);
                        return null; // this root cause will be deleted!
                    }
                });
                console.log(`FBAEditorProvider.convertv02TextFields converting from v02 to v03 ... done`);
                yamlObj.version = '0.3';
            };


            // convert data from prev v0.3:
            const convertv03RestParameters = (yamlObj: { fishbone: any[], attributes: any | undefined, version: string | undefined }) => {
                // we have to modify directly the yamlObj passed: and not return a new obj.
                console.assert(yamlObj.version === '0.3', `logical error! unexpected version=${yamlObj.version}`);
                if (yamlObj.version === '0.3') {
                    console.warn(`FBAEditorProvider.convertv03RestParameters converting from v03 to v04 ...`);
                    const updateSource = (obj: { source: string | { url: string } }) => {
                        // old format was as well: source.url=...
                        const srcString: string = typeof obj.source === 'string' ? obj.source : (typeof obj.source?.url === 'string' ? obj.source.url : '');
                        if (srcString.startsWith('ext:mbehr1.dlt-logs')) {
                            // split into the components: path?cmd1=parm1&cmd2=parm2&...
                            // parmx needs to be uri encoded
                            const indexOfQ = srcString.indexOf('?');
                            if (indexOfQ > 0) {
                                const commandsNew: string[] = [];
                                const options = srcString.slice(indexOfQ + 1);
                                const optionArr = options.split('&');
                                for (const commandStr of optionArr) {
                                    const eqIdx = commandStr.indexOf('=');
                                    const command = commandStr.slice(0, eqIdx);
                                    const commandParams = commandStr.slice(eqIdx + 1);
                                    commandsNew.push(`${command}=${encodeURIComponent(commandParams)}`);
                                }
                                const newRequest = `${srcString.slice(0, indexOfQ)}?${commandsNew.join('&')}`;
                                console.warn(` converted (uri encoded)\n  ${JSON.stringify(obj)} to .source=\n  '${newRequest}'`);
                                obj.source = newRequest;
                            }
                        } else {
                            if (typeof obj.source !== 'string') { // to get rid of the "source.url ones..."
                                console.warn(` converted (.source.url to .source)\n  ${JSON.stringify(obj)} to .source=\n  '${srcString}'`);
                                obj.source = srcString;
                            }
                        }
                    };

                    // update all badge.source, badge2.source, filter.source for ext...dlt-logs...
                    deepRootCausesForEachNonAsync(yamlObj.fishbone, [], rc => {
                        try {
                        if (rc.type === 'react' && rc.element === 'FBACheckbox' && typeof rc.props === 'object') {
                            if ('filter' in rc.props && 'badge' in rc.props.filter) { if (!('badge' in rc.props)) { rc.props.badge = rc.props.filter.badge; delete rc.props.filter['badge']; } }
                            if ('filter' in rc.props && 'badge2' in rc.props.filter) { if (!('badge2' in rc.props)) { rc.props.badge2 = rc.props.filter.badge2; delete rc.props.filter['badge2']; } }
                            if ('badge' in rc.props && 'source' in rc.props.badge) { updateSource(rc.props.badge); }
                            if ('badge2' in rc.props && 'source' in rc.props.badge2) { updateSource(rc.props.badge2); }
                            if ('filter' in rc.props && 'source' in rc.props.filter) { updateSource(rc.props.filter); }
                            // prev. we had filter.apply. -> change it consistently to filter.source as well.
                            if ('filter' in rc.props && 'apply' in rc.props.filter) {
                                if (!('source' in rc.props.filter)) { // if its there already we dont overwrite
                                    rc.props.filter.source = rc.props.filter.apply; updateSource(rc.props.filter);
                                } else {
                                    console.warn(` FBAEditorProvider.convertv03RestParameters deleting filter.apply as filter.source already exists while migrating ${JSON.stringify(rc)}`);
                                }
                                delete rc.props.filter['apply']; // we delete anyhow to cleanup
                            }
                            return rc;
                        }
                        return undefined; // no change
                        } catch (e) {
                            console.warn(` FBAEditorProvider.convertv03RestParameters got error ${e.type}:${e.message} migrating ${JSON.stringify(rc)}`);
                            return null; // this root cause will be deleted!
                        }
                    });

                    // update all attributes with 
                    // <key>.dataProvider: {
                    //          source: 'ext:mbehr1.dlt-logs/get/docs?ecu="${attributes.ecu}"',
                    if (Array.isArray(yamlObj.attributes) && yamlObj.attributes.length > 0) {
                        yamlObj.attributes.forEach(attr => {
                            const keyObj = attr[Object.keys(attr)[0]];
                            if ('dataProvider' in keyObj && 'source' in keyObj.dataProvider) { updateSource(keyObj.dataProvider); }
                        });
                    }
                    console.log(`FBAEditorProvider.convertv03RestParameters converting from v03 to v04 ... done`);
                    yamlObj.version = '0.4';
                }
            };

            // convert data from prev v0.4: attributes change values to query only for current doc
            const convertv04Attributes = (yamlObj: { fishbone: any[], attributes: any | undefined, version: string | undefined }) => {
                if (yamlObj.version === '0.4') {
                    console.warn(`FBAEditorProvider.convertv04Attributes converting from v04 to v05 ...`);
                    if (Array.isArray(yamlObj.attributes) && yamlObj.attributes.length > 0) {
                        yamlObj.attributes.forEach(attr => {
                            const attrId = Object.keys(attr)[0];
                            const keyObj = attr[attrId];
                            if ('dataProvider' in keyObj) {
                                switch (attrId) {
                                    case 'ecu':
                                        keyObj.dataProvider = {
                                            source: 'ext:mbehr1.dlt-logs/get/docs/0',
                                            jsonPath: '$.data.attributes.ecus[*].name'
                                        };
                                        break;
                                    case 'sw':
                                        keyObj.dataProvider = {
                                            // eslint-disable-next-line no-template-curly-in-string
                                            source: `ext:mbehr1.dlt-logs/get/docs/0/ecus?ecu=${encodeURIComponent('"${attributes.ecu}"')}`,
                                            jsonPath: '$.data[*].attributes.sws[*]'
                                        };
                                        break;
                                    case 'lifecycles':
                                        keyObj.dataProvider = {
                                            // eslint-disable-next-line no-template-curly-in-string
                                            source: `ext:mbehr1.dlt-logs/get/docs/0/ecus?ecu=${encodeURIComponent('"${attributes.ecu}"')}`,
                                            jsonPath: '$.data[*].attributes.lifecycles[*].attributes'
                                        };
                                        break;
                                    default: break; // skip
                                }
                            }
                        });
                    }
                    console.warn(`FBAEditorProvider.convertv04Attributes converting from v04 to v05 ... done`);
                    yamlObj.version = '0.5';
                }
            };

            // convert from prev. known formats:
            if (yamlObj?.version === '0.1') {
                // the effects storage has changed:
                if (yamlObj.fishbone) {
                    const fbv02 = convertv01Effects(yamlObj.fishbone);
                    console.log(`fbv02=`, fbv02);
                    yamlObj.fishbone = fbv02;
                }
                yamlObj.version = '0.2';
            }

            if (yamlObj?.version === '0.2') {
                // the instruction, background and comment field has changed from string to object:
                convertv02TextFields(yamlObj);
            }

            if (yamlObj?.version === '0.3') {
                // uri encoded parameter for dlt-logs rest queries:
                convertv03RestParameters(yamlObj);
            }

            if (yamlObj?.version === '0.4') { convertv04Attributes(yamlObj); }

            if (yamlObj?.version === '0.5') {
                yamlObj.version = '0.6'; // change from js-yaml lib 3.x to 4.x
                // no further migration needed but to identify files in case of errors we create a backup
                if (yamlObj.backups === undefined) {
                    yamlObj.backups = [];
                }
                yamlObj.backups.push({
                    date: Date.now(),
                    reason: `conversion from v0.5 to v0.6`,
                    textDeflated: zlib.deflateSync(text).toString('base64')
                });
            }

            // we're not forwards compatible. 
            if (yamlObj?.version !== currentFBAFileVersion) {
                const msg = `Fishbone: The document uses unknown version ${yamlObj?.version}. Please check whether an extension update is available.`;
                throw new Error(msg);
            }

            return { attributes: yamlObj?.attributes, fishbone: yamlObj.fishbone, title: yamlObj.title || '<please add title to .fba>', backups: yamlObj.backups || [] };
        } catch (e) {
            vscode.window.showErrorMessage(`Fishbone: Could not get document as yaml. Content is not valid yaml. Error= ${e.name}:${e.message}`);
            throw new Error(`Fishbone: Could not get document as yaml. Content is not valid yaml. Error= ${e.name}:${e.message}`);
        }
    }

    /**
     * Parse the documents content into an object.
     */
    static getFBDataFromDoc(docData: DocData, doc: vscode.TextDocument): any {
        const text = doc.getText();

        return FBAEditorProvider.getFBDataFromText(text);
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
        console.warn(`FBAEditorProvider.mergeAttributes mainAttrs=${JSON.stringify(mainAttrs)} newAttrs=${JSON.stringify(newAttrs)}`);
        // attributes are arrays of objects with a single key (the name)
        if (newAttrs === undefined) { return; }
        const mainKeys = mainAttrs.map(a => Object.keys(a)[0]);
        for (const newKeyObj of newAttrs) {
            const newKey = Object.keys(newKeyObj)[0];
            if (!mainKeys.includes(newKey)) {
                mainAttrs.push(newKeyObj);
            }
        }
    }

    provideFileDecoration(uri: vscode.Uri, token: vscode.CancellationToken): vscode.FileDecoration | undefined {
        console.warn(`FBAEditorProvider.provideFileDecoration(uri=${uri.toString()})...`);
        if (uri.toString().endsWith('.fba')) {
            console.warn(` FBAEditorProvider.provideFileDecoration returning a test FileDecoration`);
            return {
                badge: "42", // max 2 digits
                tooltip: "fba contains 42 errors", color: new vscode.ThemeColor('errorForeground'), propagate: true
            };
        }
        return undefined;
    }
}