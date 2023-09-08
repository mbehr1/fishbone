/**
 * copyright (c) 2023, Matthias Behr
 *
 * todo:
 * [] implement watch
 * [] implement frag (aka members)
 * [] fix fba staying old if hidden
 * [] how to provide a file type (json,...) to command.open
 */

import { TextDecoder, TextEncoder } from 'util'
import * as vscode from 'vscode'
import { FBAEditorProvider, FishboneTreeItem } from './fbaEditor'

export class FBAFSProvider implements vscode.FileSystemProvider {
  private onDidChangeEmitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>()

  constructor(private editorProvider: FBAEditorProvider) {
    this.onDidChangeFile = this.onDidChangeEmitter.event
  }

  private static decodeQueryParams(query: string): Record<string, string> {
    return query.split('&').reduce((accumulator: Record<string, string>, singleQueryParam) => {
      const [key, value] = singleQueryParam.split('=')
      accumulator[key] = decodeURIComponent(value)
      return accumulator
    }, {})
  }

  /**
   * get data for uri from the known documents from provider
   *
   * @param uri
   * @returns a member from the docData.lastPostedObj that can/must be modified directly!
   */
  private getDataForUri(uri: vscode.Uri): [FishboneTreeItem, any] | undefined {
    console.log(`FBAFSProvider.getDataForUri(${uri.toString()})`)
    try {
      const title = uri.path.slice(1) // without the /
      const queryParams = FBAFSProvider.decodeQueryParams(uri.query)

      // do we find a document?
      const treeItems = this.editorProvider._treeRootNodes
      const doc = treeItems.find((v) => v.docData?.lastPostedObj?.title === title)
      if (doc) {
        console.log(`FBAFSProvider.getDataForUri found doc`, Object.keys(doc))
        const lastFBA = doc.docData!.lastPostedObj
        // now search for the fbUid
        const elem = FBAFSProvider.getElemFromFBA(lastFBA, queryParams)
        console.log(`FBAFSProvider.getDataForUri found elem`, elem)
        return [doc, elem]
      } else {
        console.log(`FBAFSProvider.getDataForUri found no doc for title:'${title}'`)
      }
    } catch (e) {
      console.log(`FBAFSProvider.getDataForUri() got error:'${e}'`)
    }
    return undefined
  }

  private static getElemFromFBA(fba: any, queryParams: Record<string, string>): any {
    console.log(`FBAFSProvider.getElemFromFBA(${JSON.stringify(queryParams)})`)
    // search for fbUid in fba.fishbone and fba.attributes
    const fbUid = queryParams.fbUid
    if (fbUid) {
      // todo in fishbone...
      const attributes = fba.attributes
      if (Array.isArray(attributes)) {
        for (const attr of attributes) {
          if (attr.fbUid === fbUid) {
            return attr
          }
        }
      }
    }
    return undefined
  }

  watch(uri: vscode.Uri, options: { readonly recursive: boolean; readonly excludes: readonly string[] }): vscode.Disposable {
    console.log(`FBAFSProvider.watch(${uri.toString()}, ${JSON.stringify(options)})`)
    return {
      dispose() {
        console.log(`FBAFSProvider watch on '${uri.toString()}' disposed.`)
      },
    }
  }

  /// if this fires the stat.mtime needs to advance and a correct size needs to be reported!
  onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]>

  stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
    console.log(`FBAFSProvider.stat(${uri.toString()})`)
    //console.log(`FBAFSProvider.stat uri.path='${uri.path}'`)
    //console.log(`FBAFSProvider.stat uri.query='${uri.query}'`)
    //console.log(`FBAFSProvider.stat uri.fragment='${uri.fragment}'`)

    const queryParams = FBAFSProvider.decodeQueryParams(uri.query)
    console.log(`FBAFSProvider.stat queryParams='${JSON.stringify(queryParams)}'`)

    const [doc, data] = this.getDataForUri(uri) || [undefined, undefined]
    console.log(`FBAFSProvider.stat keys(data)=`, Object.keys(data))

    const size = data ? JSON.stringify(data).length : 0

    return {
      ctime: 0,
      mtime: doc ? doc.docData?.lastPostedDocVersion || 0 : 0,
      size,
      type: vscode.FileType.File,
    }
  }

  readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
    console.log(`FBAFSProvider.readFile(${uri.toString()})`)
    const [doc, data] = this.getDataForUri(uri) || [undefined, undefined]
    if (data) {
      const text = JSON.stringify(data)
      return new TextEncoder().encode(text)
    }
    return new Uint8Array()
  }

  writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    options: { readonly create: boolean; readonly overwrite: boolean },
  ): void | Thenable<void> {
    console.log(`FBAFSProvider.writeFile(${uri.toString()}, content.length=${content.length}, options=${JSON.stringify(options)}})`)
    const [doc, data] = this.getDataForUri(uri) || [undefined, undefined]
    if (doc && doc.docData && doc._document && data) {
      const newText = new TextDecoder().decode(content)
      const newData = JSON.parse(newText)
      // modify the data object directly
      let didModify = false
      if (typeof newData === 'object') {
        Object.entries(newData).forEach(([key, value]) => {
          console.log(`FBAFSProvider.writeFile setting member '${key}'`)
          if (value !== undefined) {
            const oldValue = data[key]
            if (JSON.stringify(oldValue) !== JSON.stringify(value)) {
              data[key] = value
              didModify = true
            }
          } else {
            if (data[key] !== undefined) {
              data.delete(key)
              didModify = true
            }
          }
        })
      }
      // updateTextDocument
      FBAEditorProvider.updateTextDocument(doc.docData, doc?._document, doc?.docData?.lastPostedObj)
    } else {
      console.log(`FBAFSProvider.writeFile(${uri.toString()})...ignored due to wrong doc...`)
    }
  }

  delete(uri: vscode.Uri, options: { readonly recursive: boolean }): void | Thenable<void> {
    console.log(`FBAFSProvider.delete(${uri.toString()}, ${JSON.stringify(options)})`)
    throw vscode.FileSystemError.Unavailable('delete for fba content not possible')
  }

  rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { readonly overwrite: boolean }): void | Thenable<void> {
    console.log(`FBAFSProvider.rename(${oldUri.toString()}->${newUri.toString()}, ${JSON.stringify(options)})`)
    throw vscode.FileSystemError.Unavailable('rename for fba content not possible')
  }

  readDirectory(uri: vscode.Uri): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
    console.log(`FBAFSProvider.readDirectory(${uri.toString()})`)
    return []
  }

  createDirectory(uri: vscode.Uri): void | Thenable<void> {
    console.log(`FBAFSProvider.createDirectory(${uri.toString()})`)
    throw vscode.FileSystemError.Unavailable('create directory for fba content not possible')
  }
}
