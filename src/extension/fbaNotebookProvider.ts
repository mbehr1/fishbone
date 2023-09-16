/*
 * todos:
 * [] fix reopen a notebook after restart works only if fishbone is opened before
 */

import { TextDecoder, TextEncoder } from 'util'
import * as vscode from 'vscode'
import { Disposable } from 'vscode'
import { FBAEditorProvider, DocData } from './fbaEditor'
import { FBANBRestQueryRenderer } from './fbaNBRQRenderer'
import { FBAFSProvider } from './fbaFSProvider'

export class FBANotebookProvider implements Disposable {
  private subscriptions: vscode.Disposable[] = []
  private nbController: vscode.NotebookController
  private nbSerializer: FBANotebookSerializer

  constructor(context: vscode.ExtensionContext, private editorProvider: FBAEditorProvider, private fsProvider: FBAFSProvider) {
    // console.log(`FBANotebookProvider()...`)

    this.nbController = vscode.notebooks.createNotebookController('fba-nb-controller-1', 'fba-nb', 'Fishbone Notebook')
    this.subscriptions.push(this.nbController)
    this.nbController.supportedLanguages = ['javascript', 'json']
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
        // anything to do here? (todo)
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

    context.subscriptions.push(this)
  }

  private getDocDataForNotebook(notebook: vscode.NotebookDocument): DocData | undefined {
    //console.log(`FBANotebookProvider.getDocDataForNotebook(${notebook.uri.toString()})`)
    const openedFileData = this.fsProvider.getDataForUri(notebook.uri)
    if (openedFileData) {
      return openedFileData.doc.docData
    }
    return undefined
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
