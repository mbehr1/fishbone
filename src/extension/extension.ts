// todo add copyright, 2020 Matthias Behr

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

	context.subscriptions.push(FBAEditorProvider.register(context, reporter));
}

// this method is called when your extension is deactivated
export function deactivate() {
	console.log('extension "fishbone" is now deactive!');
}
