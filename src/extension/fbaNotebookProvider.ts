/*
 * todos:
 * [] add hover and edit support for payloadRegex
 * [] fix reopen a notebook after restart works only if fishbone is opened before
 */

import { TextDecoder, TextEncoder } from 'util'
import * as vscode from 'vscode'
import { Disposable } from 'vscode'
import { FBAEditorProvider, DocData } from './fbaEditor'
import { FBANBRestQueryRenderer } from './fbaNBRQRenderer'
import { FBAFSProvider } from './fbaFSProvider'
import { getCommandUri, jsonTokenAtRange } from './util'

export class FBANotebookProvider implements Disposable {
  private subscriptions: vscode.Disposable[] = []
  private nbController: vscode.NotebookController
  private nbSerializer: FBANotebookSerializer

  private selectedNotebooks: vscode.NotebookDocument[] = []

  constructor(context: vscode.ExtensionContext, private editorProvider: FBAEditorProvider, private fsProvider: FBAFSProvider) {
    // console.log(`FBANotebookProvider()...`)

    this.nbController = vscode.notebooks.createNotebookController('fba-nb-controller-1', 'fba-nb', 'Fishbone Notebook')
    this.subscriptions.push(this.nbController)
    this.nbController.supportedLanguages = ['javascript', 'json', 'fbJsonPath']
    this.nbController.supportsExecutionOrder = true // or false?
    this.nbController.description = 'Fishbone Notebook to edit/test root causes, filters, conversionFns,...'
    this.nbController.executeHandler = this._executeAll.bind(this)
    this.nbController.onDidChangeSelectedNotebooks(
      (event) => {
        console.log(
          `FBANotebookProvider.onDidChangeSelectedNotebooks(event.selected=${event.selected})...`,
          event.notebook.uri,
          event.notebook.version,
        )
        if (event.selected) {
          if (!this.selectedNotebooks.find((nb) => nb.uri.toString() === event.notebook.uri.toString())) {
            this.selectedNotebooks.push(event.notebook)
          }
        } else {
          const idx = this.selectedNotebooks.findIndex((nb) => nb.uri.toString() === event.notebook.uri.toString())
          if (idx >= 0) {
            this.selectedNotebooks.splice(idx, 1)
          }
        }
      },
      this,
      this.subscriptions,
    )

    this.nbSerializer = new FBANotebookSerializer()
    this.subscriptions.push(
      vscode.workspace.registerNotebookSerializer('fba-nb', this.nbSerializer, {
        transientOutputs: true,
      }),
    )

    this.subscriptions.push(
      vscode.languages.registerHoverProvider(
        {
          language: 'jsonc',
          scheme: 'vscode-notebook-cell', // todo restrict further to our uris and not all jsonc in notebook cells!
        },
        {
          async provideHover(document, position) {
            console.log(`FBANotebookProvider.provideHover`)
            const wordRange = document.getWordRangeAtPosition(position)
            if (wordRange) {
              const word = document.getText(wordRange)
              // todo avoid hardcoding! generalize
              if (word === 'conversionFunction') {
                const convToken = jsonTokenAtRange(document.getText(), wordRange)
                if (convToken) {
                  const md = new vscode.MarkdownString(
                    `$(edit) [Show as cell](${getCommandUri('fishbone.notebookCmd', [
                      { doc: document.uri.toString(), cmd: 'showAsCell' },
                      { token: convToken },
                    ]).toString()})`,
                    true,
                  )
                  md.supportHtml = true
                  md.isTrusted = true
                  return new vscode.Hover(md, wordRange)
                }
              }
            }
            return undefined
          },
        },
      ),
    )

    this.subscriptions.push(
      vscode.commands.registerCommand('fishbone.notebookCmd', (...args) => {
        this.onCommand(args)
      }),
    )
  }

  private getDocDataForNotebook(notebook: vscode.NotebookDocument): DocData | undefined {
    //console.log(`FBANotebookProvider.getDocDataForNotebook(${notebook.uri.toString()})`)
    const openedFileData = this.fsProvider.getDataForUri(notebook.uri)
    if (openedFileData) {
      return openedFileData.doc.docData
    }
    return undefined
  }

  /**
   * Process commands e.g. coming from hover provider links
   * @param args array of args. First entry has to include 'cmd' and 'doc'. Other args will be passed on to the handler for the cmd.
   */
  public onCommand(args: any[]): void {
    try {
      console.log(`FBANotebookProvider.onCommand args=${JSON.stringify(args)}`)
      // try to find the doc:
      const cmd = <string | undefined>args[0]?.cmd
      const docUri = args[0]?.doc ? vscode.Uri.parse(args[0].doc) : undefined
      if (docUri && cmd) {
        let docCell
        for (const nb of this.selectedNotebooks) {
          for (const cell of nb.getCells()) {
            if (cell.document.uri.toString() === docUri.toString()) {
              docCell = cell
              break
            }
          }
        }
        if (docCell && docCell.metadata?.fbaRdr === 'FBANBRestQueryRenderer') {
          FBANBRestQueryRenderer.onCellCmd(docCell, cmd, args.slice(1))
        }
        /*
        const fbaFsUri = docUri.with({ scheme: 'fbaFs', fragment: '' })
        console.log(`FBANotebookProvider.onCommand fbaFsUri=${fbaFsUri.toString()}`)
        const openedFileData = this.fsProvider.getDataForUri(fbaFsUri)
        */
      } else {
        console.warn(`FBANotebookProvider.onCommand no doc! args=${JSON.stringify(args)}`)
      }
    } catch (e) {
      console.warn(`FBANotebookProvider.onCommand got error=${e}`)
    }
  }

  private _executeAll(cells: vscode.NotebookCell[], notebook: vscode.NotebookDocument): void {
    console.log(`FBANotebookProvider._executeAll(#cells=${cells.length})...`)
    for (const cell of cells) {
      console.log(`FBANotebookProvider._executeAll cell#${cell.index}.metadata=${JSON.stringify(cell.metadata)}`)
      // poc for conversionFunction:
      if (cell.metadata?.fbaRdr === 'FBANBRestQueryRenderer') {
        const docData = this.getDocDataForNotebook(notebook)
        if (docData) {
          FBANBRestQueryRenderer.executeCell(this.nbController, cell, notebook, docData, this.editorProvider)
        }
      }
    }
  }

  dispose() {
    console.log(`FBANotebookProvider.dispose()...`)
    this.subscriptions.forEach((s) => s.dispose())
    this.subscriptions.length = 0
  }
}

// we do serialize only those fields
// (on deserialize we do use all from the content/json)
// todo we don't synchronize the metadata of the notebook itself yet
//  change cells[] into an object with proper version, notebook.metadata and cells
export interface RawNotebookCell {
  kind: vscode.NotebookCellKind
  languageId: string
  value: string
  editable?: boolean
  metadata?: any // for the cell, json serializable
}

class FBANotebookSerializer implements vscode.NotebookSerializer {
  private readonly _decoder = new TextDecoder()
  private readonly _encoder = new TextEncoder()

  deserializeNotebook(data: Uint8Array, token: vscode.CancellationToken): vscode.NotebookData | Thenable<vscode.NotebookData> {
    console.log(`FBANotebookSerializer.deserializeNotebook(data.length=${data.length})...`)

    let contents = '[]'
    try {
      contents = data.length > 0 ? this._decoder.decode(data) : '[]'
    } catch (e) {
      console.warn(`FBANotebookSerializer.deserializeNotebook decode got e='${e}'`)
    }

    let cells: vscode.NotebookCellData[]
    try {
      cells = <vscode.NotebookCellData[]>JSON.parse(contents)
      console.log(`FBANotebookSerializer.deserializeNotebook(#cells=${cells.length})`)
    } catch (e) {
      console.warn(`FBANotebookSerializer.deserializeNotebook parse got e='${e}'`)
      cells = []
    }
    return new vscode.NotebookData(cells)
  }

  serializeNotebook(data: vscode.NotebookData, token: vscode.CancellationToken): Uint8Array | Thenable<Uint8Array> {
    console.log(`FBANotebookSerializer.serializeNotebook(data.cells.length=${data.cells.length})... metadata=`, data.metadata)
    if (data.metadata) {
      console.warn(`FBANotebookSerializer.serializeNotebook(...) wont persist metadata! =`, data.metadata)
    }
    const rawCells: RawNotebookCell[] = data.cells.map((cell) => {
      return { kind: cell.kind, languageId: cell.languageId, value: cell.value, metadata: cell.metadata }
    })
    return this._encoder.encode(JSON.stringify(rawCells, undefined, 2))
  }
}
