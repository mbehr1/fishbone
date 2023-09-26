import * as path from 'path';

import { runTests } from 'vscode-test'

async function main() {
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, '../../')

    // The path to test runner
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, './suite/index')

    // Download VS Code, unzip it and run the integration test
    console.log(`running on platform:'${process.platform} ${process.arch}'`)
    await runTests({
      version: '1.80.0',
      platform: process.platform === 'darwin' && process.arch === 'arm64' ? 'darwin-arm64' : undefined,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [__dirname, '--disable-extensions', '--disable-workspace-trust'],
    })
  } catch (err) {
    console.error('Failed to run tests')
    process.exit(1)
  }
}

main();
