/**
 * copyright (c) 2020, Matthias Behr
 *
 * todo:
 * - add nonce/random ids to each element? (for smaller edits/updates)
 */

import * as path from 'path';
import * as vscode from 'vscode';
import { getNonce } from './util';
import * as yaml from 'js-yaml';

interface AssetManifest {
    files: {
        'main.js': string;
        'main.css': string;
        'runtime-main.js': string;
        [key: string]: string;
    };
}

/**
 * 
 */
export class FBAEditorProvider implements vscode.CustomTextEditorProvider {

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new FBAEditorProvider(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider(FBAEditorProvider.viewType, provider);
        return providerRegistration;
    }

    private static readonly viewType = 'fishbone.fba'; // has to match the package.json

    constructor(
        private readonly context: vscode.ExtensionContext
    ) { }

    /**
     * Called when our custom editor is opened.
     */
    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        // Setup initial content for the webview
        webviewPanel.webview.options = {
            enableScripts: true,
        };
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

        // the panel can only receive data once fully loaded.
        // So we do wait for the panel to send an alive
        // then we'll send our data:

        let docData: { gotAliveFromPanel: boolean, msgsToPost: any[] } = {
            gotAliveFromPanel: false,
            msgsToPost: []
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
            console.log(`updateWebview called`);

            const docObj: any = FBAEditorProvider.getFBDataFromText(document.getText());

            postMsgOnceAlive({
                type: 'update',
                data: docObj.fishbone,
                title: docObj.title,
                attributes: docObj.attributes
            });
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
                updateWebview();
            }
        });

        // Make sure we get rid of the listener when our editor is closed.
        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });

        // Receive message from the webview.

        webviewPanel.webview.onDidReceiveMessage(e => {
            docData.gotAliveFromPanel = true;
            // any messages to post?
            if (docData.msgsToPost.length) {
                let msg: any;
                while (msg = docData.msgsToPost.pop()) {
                    const msgCmd = JSON.stringify(msg);
                    webviewPanel.webview.postMessage(msg); /*.then((onFulFilled) => {
                        console.log(`WebsharkView.postMessage(${msgCmd}) queued ${onFulFilled}`);
                    });*/
                }
            }

            switch (e.type) {
                case 'update':
                    this.updateTextDocument(document, { fishbone: e.data, title: e.title, attributes: e.attributes })?.then((fulfilled) => {
                        console.log(`updateTextDocument fulfilled=${fulfilled}`);
                    }); // same as update webview
                    break;
                case 'log':
                    console.log(e.message);
                    return;
                default:
                    console.log(`FBAEditorProvider.onDidReceiveMessage e=${JSON.stringify(e)}`);
                    break;
            }
        });

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

        const mainUri: vscode.Uri = vscode.Uri.file(path.join(webviewPath, main)).with({ scheme: 'vscode-resource' });
        const stylesUri: vscode.Uri = vscode.Uri.file(path.join(webviewPath, styles)).with({ scheme: 'vscode-resource' });
        const runTimeMainUri: vscode.Uri = vscode.Uri.file(path.join(webviewPath, runTime)).with({ scheme: 'vscode-resource' });
        const chunkUri: vscode.Uri = vscode.Uri.file(path.join(webviewPath, chunk)).with({ scheme: 'vscode-resource' });

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

				<!--
				Use a content security policy to only allow loading images from https or from our extension directory,
				and only allow scripts that have a specific nonce.
				-->

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
     * Add a new scratch to the current document.

    private addNewScratch(document: vscode.TextDocument) {
        const json = this.getDocumentAsJson(document);
        json.scratches = [
            ...(Array.isArray(json.scratches) ? json.scratches : []),
            {
                id: getNonce(),
                text: 'bla',
                created: Date.now(),
            }
        ];

        return this.updateTextDocument(document, json);
    } */

    /**
     * Delete an existing scratch from a document.

    private deleteScratch(document: vscode.TextDocument, id: string) {
        const json = this.getDocumentAsJson(document);
        if (!Array.isArray(json.scratches)) {
            return;
        }

        json.scratches = json.scratches.filter((note: any) => note.id !== id);

        return this.updateTextDocument(document, json);
    } */

    /**
     * Write out the object to a given document.
     */
    private updateTextDocument(document: vscode.TextDocument, docObj: any) {
        console.log(`updateTextDocument called with json.keys=${Object.keys(docObj)}`);
        Object.keys(docObj).forEach(key => {
            console.log(` ${key}=${JSON.stringify(docObj[key])}`);
        });

        const edit = new vscode.WorkspaceEdit();

        // Just replace the entire text document every time for now.
        let yamlObj: any = {};
        try {
            yamlObj = yaml.safeLoad(document.getText()); // JSON.parse(document.getText());
            if (typeof yamlObj !== 'object') {
                console.error('Could not get document as json. Content is not valid yamlObj ' + JSON.stringify(yamlObj));
                yamlObj = {};
            }
        } catch (e) {
            console.error('Could not get document as json. Content is not valid yaml e= ' + e);
        }

        // only 'title', 'attributes' and 'fishbone' are updated for now. keep the rest:

        if ('title' in docObj) { yamlObj.title = docObj.title; }
        if (('attributes' in docObj) && docObj.attributes !== undefined) { yamlObj.attributes = docObj.attributes; }
        if ('fishbone' in docObj) { yamlObj.fishbone = docObj.fishbone; }

        // now store it as yaml:
        try {
            const yamlStr = yaml.safeDump(yamlObj);

    /*console.log(`new yaml text=
    ${yamlStr}
    `);*/

            edit.replace(
                document.uri,
                new vscode.Range(0, 0, document.lineCount, 0),
                yamlStr);

        } catch (e) {
            console.error(`storing as YAML failed. Error=${e}`);
            return;
        }
        return vscode.workspace.applyEdit(edit);
    }

/**
 * Parse the documents content into an object.
 */
    static getFBDataFromText(text: string): any {
    /*console.log(`getFBDataFromText text=
    ${text}
    `);*/

        // here we do return the data that we pass as data=... to the Fishbone

        // our document is a yaml document. 
        // representing a single object with properties:
        //  type <- expect "fba"
        //  version <- 0.1
        //  fishbone : array <- we use this as fishbone data

        if (text.trim().length === 0) {
            return { fishbone: [], title: '<please set title>' }; // empty or initial data?
        }

        try {
            const yamlObj: any = yaml.safeLoad(text); // JSON.parse(text);
            if (typeof yamlObj !== 'object') { return []; }
            console.log(`getFBDataFromText type=${yamlObj.type}, version=${yamlObj.version}`);
            console.log(`getFBDataFromText title=${yamlObj.title}`);
            return { attributes: yamlObj?.attributes, fishbone: yamlObj.fishbone, title: yamlObj.title || '<please add title to .fba>' };
        } catch (e) {
            throw new Error('Could not get document as yaml. Content is not valid yaml e= ' + e);
        }
        return { title: '<error>' };
    }
}