import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

  /**
   * 1. Precondition: None (pure array indexOf test).
   * 2. Test steps: Call indexOf on an array with values not present.
   * 3. Expected response: indexOf returns -1 for missing values.
   * 4. Postcondition: No side effects.
   */
  test('Sample test', () => {
		assert.equal(-1, [1, 2, 3].indexOf(5));
		assert.equal(-1, [1, 2, 3].indexOf(0));
	});
});
