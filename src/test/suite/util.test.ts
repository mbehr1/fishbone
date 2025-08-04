import * as vscode from 'vscode'
import * as assert from 'assert'
import { arrayEquals, getCommandUri, getMemberParent, getNonce, jsonTokenAtRange } from '../../extension/util'

suite('util module', () => {
  /**
   * 1. Precondition: None (getNonce is a pure function).
   * 2. Test steps: Call getNonce() twice.
   * 3. Expected response: The two returned values are not equal.
   * 4. Postcondition: No side effects.
   */
  test('nonces are different', () => {
    const n1 = getNonce()
    const n2 = getNonce()
    assert.notEqual(n1, n2)
  })

  /**
   * 1. Precondition: None (arrayEquals is a pure function).
   * 2. Test steps: Call arrayEquals with various array pairs.
   * 3. Expected response: Returns true for equal arrays, false otherwise.
   * 4. Postcondition: No side effects.
   */
  test('arrayEquals handles examples', () => {
    assert.ok(arrayEquals([], []))
    assert.ok(!arrayEquals([], [1]))
    assert.ok(!arrayEquals(null as unknown as number[], [1]))
    assert.ok(!arrayEquals([0], [1]))
    assert.ok(arrayEquals([1], [1]))
    assert.ok(arrayEquals([1, 'a'], [1, 'a']))
    assert.ok(!arrayEquals([1, { a: true }], [1, { a: true }])) // not deep equal!
    const oA = { a: true }
    assert.ok(arrayEquals([1, oA], [1, oA]))
  })

  /* todo found no nice way to test whether calling a uri like this does really 
    keep all the parameters (incl. if they contain special chars)
  test('getCommandUri', async () => {
    const cmd = vscode.commands.registerCommand('getCommandUri_cmd1', (...args) => {
      console.log(`getCommandUri called with`, args)
      return 42
    })
    const val = await vscode.commands.executeCommand('getCommandUri_cmd1', [1, 2])
    const val2 = await vscode.commands.executeCommand('vscode.open', getCommandUri('getCommandUri_cmd1', [3, 4]))
    const val3 = await vscode.window.showTextDocument(getCommandUri('getCommandUri_cmd1', [7, 8]))

    console.log(`getCommandUri executeCommand returned`, val)
    console.log(`getCommandUri executeCommand returned`, val2)
    console.log(`getCommandUri executeCommand returned`, val3)

    cmd.dispose()
  })*/

  /**
   * 1. Precondition: None (getMemberParent is a pure function).
   * 2. Test steps: Call getMemberParent with a nested object and path.
   * 3. Expected response: Returns the correct parent object.
   * 4. Postcondition: No side effects.
   */
  test('getMemberParent handles example code', () => {
    const reportOptions = { conversionFunction: '...' }
    assert.deepStrictEqual(getMemberParent([{ a: 0 }, { a: 1, reportOptions }], [1, 'reportOptions', 'conversionFunction']), reportOptions)
  })

  /**
   * 1. Precondition: None (jsonTokenAtRange is a pure function).
   * 2. Test steps: Call jsonTokenAtRange with invalid and valid JSON and ranges.
   * 3. Expected response: Returns undefined for invalid JSON, correct token for valid JSON.
   * 4. Postcondition: No side effects.
   */
  test('jsonTokenAtRange for simple example', () => {
    assert.deepEqual(jsonTokenAtRange('noValidJson{', new vscode.Range(0, 0, 1, 20)), undefined)
    assert.deepEqual(jsonTokenAtRange('{"foo":true}', new vscode.Range(0, 2, 0, 5)), { raw: '"foo"', type: 'key', stack: [], value: 'foo' })
  })
})
