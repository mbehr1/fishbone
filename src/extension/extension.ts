// todo add copyright, 2020 Matthias Behr

import * as vscode from 'vscode';
import { FBAEditorProvider } from './fbaEditor';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('extension "fishbone" is now active!');

	context.subscriptions.push(FBAEditorProvider.register(context));
}

// this method is called when your extension is deactivated
export function deactivate() {
	console.log('extension "fishbone" is now deactive!');
}
