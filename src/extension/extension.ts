// todo add copyright, 2020 - 2021 Matthias Behr
// - inform webview of extension (restquery provider or document changes)
// - use Secrets API from 1.53 for https auth info?

import * as fs from 'fs';
import * as vscode from 'vscode';
import TelemetryReporter from 'vscode-extension-telemetry';
import { FBAEditorProvider } from './fbaEditor';

const extensionId = 'mbehr1.fishbone';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	let reporter: TelemetryReporter | undefined = undefined;
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	const extension = vscode.extensions.getExtension(extensionId);

	let extensionVersion = undefined;
	if (extension) {
		extensionVersion = extension.packageJSON.version;

		// the aik is not really sec_ret. but lets avoid bo_ts finding it too easy:
		const strKE = 'ZjJlMDA4NTQtNmU5NC00ZDVlLTkxNDAtOGFiNmIzNTllODBi';
		const strK = Buffer.from(strKE, "base64").toString();
		reporter = new TelemetryReporter(extensionId, extensionVersion, strK);
		context.subscriptions.push(reporter);
		reporter?.sendTelemetryEvent('activate');
	} else {
		console.error(`${extensionId}: not found as extension!`);
	}
	console.log(`extension ${extensionId} v${extensionVersion} is now active!`);

	FBAEditorProvider.register(context, reporter);

	context.subscriptions.push(vscode.commands.registerCommand("fishbone.addNewFile", async () => {
		console.log(`fishbone.addNewFile...`);
		vscode.window.showSaveDialog({
			filters: {
				'Fishbone analysis': ['fba']
			},
			saveLabel: 'New fishbone analysis'
		}).then(async (uri) => {
			if (uri) {
				console.log(`got uri scheme='${uri.scheme}' fspath=${uri.fsPath} path=${uri.path}`);
				// if file exists, open directly: (the overwrite warning was there already)
				if (fs.existsSync(uri.fsPath)) {
					fs.unlinkSync(uri.fsPath);
				}
				// lets create the file here already empty to avoid running into issue #7.
				fs.writeFileSync(uri.fsPath, '');
				//const newFileUri = vscode.Uri.parse(`untitled:${uri.fsPath}`);
				//await vscode.workspace.openTextDocument(newFileUri);
				//await vscode.commands.executeCommand('vscode.openWith', newFileUri, 'fishbone.fba');
				await vscode.commands.executeCommand('vscode.openWith', uri, 'fishbone.fba', { preview: false });
			}
		});
	}));
}

// this method is called when your extension is deactivated
export function deactivate() {
	console.log('extension "fishbone" is now deactive!');
}
