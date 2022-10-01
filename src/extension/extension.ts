// todo add copyright, 2020 - 2021 Matthias Behr
// - inform webview of extension (restquery provider or document changes)
// - use Secrets API from 1.53 for https auth info?

import * as fs from 'fs';
import * as vscode from 'vscode';
import TelemetryReporter from '@vscode/extension-telemetry';
import { extensionId, GlobalState } from './constants';
import { FBAEditorProvider } from './fbaEditor';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	let reporter: TelemetryReporter | undefined = undefined;
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	const extension = vscode.extensions.getExtension(extensionId);

	const prevVersion = context.globalState.get<string>(GlobalState.Version);
	let extensionVersion = '0.0.0'; // default value for unlikely case
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
	console.log(`extension ${extensionId} v${extensionVersion} ${prevVersion !== extensionVersion ? `prevVersion: ${prevVersion} ` : ''}is now active!`);

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

	void showWelcomeOrWhatsNew(context, extensionVersion, prevVersion);

	void context.globalState.update(GlobalState.Version, extensionVersion);
}

// this method is called when your extension is deactivated
export function deactivate() {
	console.log('extension "fishbone" is now deactive!');
}

async function showWelcomeOrWhatsNew(context: vscode.ExtensionContext, version: string, prevVersion: string | undefined) {

	let showFunction: undefined | ((version: string) => Promise<void>) = undefined;

	if (!prevVersion) {
		// first time install... point to docs todo
		showFunction = showWelcomeMessage;
	} else if (prevVersion !== version) {
		const [major, minor] = version.split('.').map(v => parseInt(v, 10));
		const [prevMajor, prevMinor] = prevVersion.split('.').map(v => parseInt(v, 10));
		if ((major === prevMajor && minor === prevMinor) ||
			(major < prevMajor) || // ignore downgrades
			(major === prevMajor && minor < prevMinor)) {
			return;
		}
		// major/minor version is higher
		showFunction = showWhatsNewMessage;
	}
	if (showFunction) {
		if (vscode.window.state.focused) {
			await context.globalState.update(GlobalState.PendingWhatNewOnFocus, undefined);
			void showFunction(version);
		} else {
			await context.globalState.update(GlobalState.PendingWhatNewOnFocus, true);
			const disposable = vscode.window.onDidChangeWindowState(e => {
				if (!e.focused) { return; }
				disposable.dispose();

				if (context.globalState.get(GlobalState.PendingWhatNewOnFocus) === true) {
					void context.globalState.update(GlobalState.PendingWhatNewOnFocus, undefined);
					if (showFunction) {
						void showFunction(version);
					}
				}
			});
			context.subscriptions.push(disposable);
		}
	}
}

async function showWhatsNewMessage(version: string) {
	const message = `Fishbone has been updated to v${version} - check out what's new!`;
	const actions: vscode.MessageItem[] = [{ title: "What's New" }, { title: '❤ Sponsor' }];
	const result = await vscode.window.showInformationMessage(message, ...actions);
	if (result !== undefined) {
		if (result === actions[0]) {
			await vscode.env.openExternal(vscode.Uri.parse('https://github.com/mbehr1/fishbone/blob/master/CHANGELOG.md'));
		} else if (result === actions[1]) {
			await vscode.env.openExternal(vscode.Uri.parse('https://github.com/sponsors/mbehr1'));
		}
	}
}

async function showWelcomeMessage(version: string) {
	const message = `Fishbone v${version} has been installed - check out the docs!`;
	const actions: vscode.MessageItem[] = [{ title: "Docs" }, { title: '❤ Sponsor' }];
	const result = await vscode.window.showInformationMessage(message, ...actions);
	if (result !== undefined) {
		if (result === actions[0]) {
			await vscode.env.openExternal(vscode.Uri.parse('https://mbehr1.github.io/fishbone/docs/#first-use'));
		} else if (result === actions[1]) {
			await vscode.env.openExternal(vscode.Uri.parse('https://github.com/sponsors/mbehr1'));
		}
	}
}
