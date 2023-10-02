/*
 * copyright (c) 2023, Matthias Behr
 *
 * todo:
 * [] implement frag (aka members)
 * [] fix fba staying old if hidden
 */

import { TextDecoder, TextEncoder } from 'util'
import * as vscode from 'vscode'
import { FBAEditorProvider, FBEffect, Fishbone, FishboneTreeItem } from './fbaEditor'
import { FBANBRestQueryRenderer } from './fbaNBRQRenderer'
import { RawNotebookCell } from './fbaNotebookProvider'
import { MemberPath, isEqualUint8Array } from './util'

interface OpenedFileData {
  uri: vscode.Uri // for the one opened for fbaFs
  uriParameters: UriParameters
  stat: vscode.FileStat
  content: Uint8Array
  doc: FishboneTreeItem // pointing to the underlying FBAEditorProvider document
  elem: any
  lastFBA: any // the fb/lastPostedObj where elem is from
  lastRawCells: RawNotebookCell[]
}

// we do only use path from the uri
// authorithy will be changed to lower case. so not useable for fbUid
// see decodeUri

interface UriParameters {
  ext: string
  fbaTitle?: string // Fishbone.title
  fbUid: string // mandatory
  fbUidMembers: MemberPath
  renderer: string // e.g. restquery
}

export class FBAFSProvider implements vscode.FileSystemProvider {
  private onDidChangeEmitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>()

  private openEntries: Map<string, OpenedFileData> = new Map()

  constructor(private editorProvider: FBAEditorProvider) {
    this.onDidChangeFile = this.onDidChangeEmitter.event
  }

  /**
   * notify the fs provider of any changes on the underlying fba document.
   * This is e.g. called on changes in the fishbone webview.
   * Will be called as well on changed coming from us (writeFile called after the changes have been processed)
   * @param doc
   */
  public onFbaDocChanges(doc: FishboneTreeItem) {
    console.log(`FBAFSProvider.onFbaDocChanges(v=${doc._document?.version})`)
    // check all opened documents for changes:
    for (const entry of this.openEntries.values()) {
      if (entry.doc === doc && doc.docData && doc.docData.lastPostedObj) {
        //console.log(`FBAFSProvider.onFbaDocChanges found an open entry`)
        if (entry.lastFBA !== doc.docData.lastPostedObj) {
          // get the elem again
          const lastFBA = doc.docData.lastPostedObj
          entry.elem = FBAFSProvider.getElemFromFBA(lastFBA, entry.uriParameters)
          // elem might be undefined now if the elem was deleted
          entry.lastFBA = lastFBA
        }
        if (!entry.elem) {
          console.warn(`FBAFSProvider.onFbaDocChanges elem deleted/not found. marking entry as deleted`)
          this.openEntries.delete(entry.uri.toString())
          this.onDidChangeEmitter.fire([{ uri: entry.uri, type: vscode.FileChangeType.Deleted }])
        } else {
          this.updateEntry(entry, true)
        }
      }
    }
  }

  private static decodeUri(uri: vscode.Uri): UriParameters {
    // uri.path = /<fbUid>/<fbUidMembersSepByDot><renderer>/title.ext
    const paths = uri.path.slice(1).split('/')
    const fbUidMembers = paths.length > 1 ? paths[1].split('.') : []
    // console.log(`FBAFSProvider.decodeUri fbUidMembers=${JSON.stringify(fbUidMembers)}`)
    const title = paths[paths.length - 1]
    const indexOfDot = title.lastIndexOf('.')
    const ext = indexOfDot >= 0 && indexOfDot < title.length ? title.substring(indexOfDot + 1) : ''
    const renderer = paths.length > 2 ? paths[paths.length - 2] : ''
    return {
      ext,
      fbaTitle: title.length ? title : undefined,
      fbUid: paths[0],
      fbUidMembers: fbUidMembers,
      renderer,
    }
  }

  /**
   * get data for uri from the known documents from provider
   *
   * @param uri
   * @returns a member from the docData.lastPostedObj that can/must be modified directly!
   */
  public getDataForUri(uri: vscode.Uri): OpenedFileData | undefined {
    const cachedEntry = this.openEntries.get(uri.toString())
    if (cachedEntry) {
      return cachedEntry
    }
    console.log(`FBAFSProvider.getDataForUri(${uri.toString()}) not in cache`)
    try {
      const uriParameters = FBAFSProvider.decodeUri(uri)
      const { fbUid } = uriParameters

      const getElemFromDoc = (uri: vscode.Uri, doc: FishboneTreeItem): OpenedFileData | undefined => {
        const lastFBA = doc.docData!.lastPostedObj
        // now search for the fbUid
        const elem = FBAFSProvider.getElemFromFBA(lastFBA, uriParameters)
        console.log(`FBAFSProvider.getDataForUri found elem`, elem)
        if (elem) {
          const entry = {
            uri,
            uriParameters,
            doc,
            elem,
            lastFBA,
            content: new Uint8Array(),
            lastRawCells: [],
            stat: {
              ctime: Date.now(),
              mtime: Date.now(),
              size: 0,
              type: vscode.FileType.File,
            },
          }
          this.updateEntry(entry, false)
          return entry
        } else {
          return undefined
        }
      }

      // do we find a document?
      const treeItems = this.editorProvider._treeRootNodes
      // search in all docs:
      for (const doc of treeItems) {
        const toRet = getElemFromDoc(uri, doc)
        if (toRet) {
          this.openEntries.set(uri.toString(), toRet)
          return toRet
        }
      }
      console.log(`FBAFSProvider.getDataForUri found no doc for fbUid:'${fbUid}'`)
    } catch (e) {
      console.log(`FBAFSProvider.getDataForUri() got error:'${e}'`)
    }
    return undefined
  }

  private static getElemFromFBA(fba: Fishbone, uriParameters: UriParameters): any | undefined {
    const fbUid = uriParameters.fbUid
    // console.log(`FBAFSProvider.getElemFromFBA(fbUid=${fbUid})})`)
    // search for fbUid in fba.fishbone and fba.attributes

    const getElemFromEffects = (effects: FBEffect[]): any => {
      for (const effect of effects) {
        if (effect.fbUid === fbUid) {
          return effect
        }
        for (const category of effect.categories) {
          if (category.fbUid === fbUid) {
            return category
          }
          for (const rc of category.rootCauses) {
            if (rc.fbUid === fbUid) {
              return rc
            }
            if (rc.type === 'nested') {
              const retNested = rc.data ? getElemFromEffects(rc.data) : undefined
              if (retNested) {
                return retNested
              }
            }
          }
        }
      }
    }

    const retEffects = getElemFromEffects(fba.fishbone)
    if (retEffects) {
      return retEffects
    }

    const attributes = fba.attributes
    if (Array.isArray(attributes)) {
      for (const attr of attributes) {
        if (attr.fbUid === fbUid) {
          return attr
        }
      }
    }
    return undefined
  }

  /**
   * generate new content (text for fba-nb) aka serialized cells
   * @param entry
   * @param checkForChanges
   */
  private updateEntry(entry: OpenedFileData, checkForChanges: boolean, lastRawCells?: RawNotebookCell[]) {
    // update the entry (content, size) from the doc/elem:
    console.log(
      `FBAFSProvider.updateEntry (uri.path='${entry.uri.path}' uriParameters.ext='${entry.uriParameters.ext}', checkForChanges=${checkForChanges})`,
    )
    let lastMTime = entry.stat.mtime
    if (lastRawCells) {
      entry.lastRawCells = lastRawCells
    }
    switch (entry.uriParameters.ext) {
      case 'fba-nb':
        {
          let cells: vscode.NotebookCellData[] = []
          let elem = entry.elem
          let members: MemberPath = []
          // search fbUidMembers
          for (const member of entry.uriParameters.fbUidMembers) {
            if (typeof elem === 'object' && member in elem) {
              elem = elem[member]
              members.push(member)
            } else {
              console.warn(`FBAFSProvider.updateEntry cannot find member '${member}' from ${entry.uriParameters.fbUidMembers.join('/')} )`)
              // todo abort then!
            }
          }
          switch (entry.uriParameters.renderer) {
            case 'restquery':
              {
                // the elem should be the restQuery
                cells = FBANBRestQueryRenderer.renderRestQuery(elem, entry.elem.fbUid, members, entry.lastRawCells)
              }
              break
            default:
              {
                cells.push(
                  new vscode.NotebookCellData(
                    vscode.NotebookCellKind.Code,
                    JSON.stringify(
                      elem,
                      (key, value) => {
                        return key === 'fbUid' ? undefined : value
                      },
                      2,
                    ),
                    'json',
                  ),
                )
                cells[0].metadata = { fbUid: entry.elem.fbUid, fbUidMembers: members }
              }
              break
          }
          const text = JSON.stringify(
            cells,
            (key, value) => {
              return key === 'outputs' ? undefined : value
            },
            2,
          )
          const newContent = new TextEncoder().encode(text)
          if (!checkForChanges || !isEqualUint8Array(newContent, entry.content)) {
            entry.content = newContent
            entry.stat.size = entry.content.length
            entry.stat.mtime = Date.now()
          } else {
            console.log(`FBAFSProvider.updateEntry detected no change`)
          }
        }
        break
      default:
        {
          const text = JSON.stringify(entry.elem)
          const newContent = new TextEncoder().encode(text)
          if (!checkForChanges || !isEqualUint8Array(newContent, entry.content)) {
            entry.content = newContent
            entry.stat.size = entry.content.length
            entry.stat.mtime = Date.now()
          }
        }
        break
    }
    if (entry.stat.mtime !== lastMTime) {
      // fire updates on watch
      const uriString = entry.uri.toString()
      const watch = this._watches.find((v) => v.toString() === uriString)
      if (watch) {
        setTimeout(() => {
          console.log(`FBAFSProvider.updateEntry (uri.path='${entry.uri.path}') firing Changed event uri=${watch.toString()}`)
          entry.stat.mtime = Date.now()
          this.onDidChangeEmitter.fire([{ uri: watch, type: vscode.FileChangeType.Changed }])
        }, 1000) // todo how to avoid the need for a delay?
        // this.onDidChangeEmitter.fire([{ uri: watch, type: vscode.FileChangeType.Changed }])
      }
    }
  }

  /**
   * update the entry/fbUid based on new content from a notebook/cells
   * @param entry
   * @param content
   */
  private editEntry(entry: OpenedFileData, content: Uint8Array) {
    console.log(`FBAFSProvider.editEntry (uri.path='${entry.uri.path}' uriParameters.ext='${entry.uriParameters.ext}')`)
    const newText = new TextDecoder().decode(content)
    const newData = <RawNotebookCell[]>JSON.parse(newText)

    switch (entry.uriParameters.ext) {
      case 'fba-nb':
        {
          let elem = entry.elem
          let members: MemberPath = []
          // search fbUidMembers
          let elemObj: any | undefined // last obj
          let elemMember: string | number | undefined
          for (const member of entry.uriParameters.fbUidMembers) {
            if (typeof elem === 'object' && member in elem) {
              elemObj = elem
              elemMember = member
              elem = elem[member]
              members.push(member)
            }
          }
          switch (entry.uriParameters.renderer) {
            case 'restquery':
              {
                // the elem should be the restQuery
                if (elemMember) {
                  if (FBANBRestQueryRenderer.editRestQuery(elemObj, elemMember, entry.elem.fbUid, members, newData)) {
                    this.updateEntry(entry, false, newData)
                    this.syncChangesToEditorProvider(entry)
                  }
                }
              }
              break
            default:
              console.log(`FBAFSProvider.editEntry nyi for renderer: '${entry.uriParameters.renderer}'`)
              break
          }
        }
        break
      default:
        console.log(`FBAFSProvider.editEntry nyi for ext: '${entry.uriParameters.ext}'`)
        break
    }
  }

  /**
   * sync changes coming from the here (e.g. after a notebook save) to the EditorProvider so that the
   * data is stored (marked as changed) in the .fba file and the webview is updated.
   * @param entry
   */
  private syncChangesToEditorProvider(entry: OpenedFileData) {
    if (entry.doc.docData && entry.doc._document) {
      console.log(`FBAFSProvider.syncChangesToEditorProvider(...)`)
      FBAEditorProvider.updateTextDocument(entry.doc.docData, entry.doc._document, entry.doc.docData.lastPostedObj)
    }
  }

  private _watches: vscode.Uri[] = []

  watch(uri: vscode.Uri, options: { readonly recursive: boolean; readonly excludes: readonly string[] }): vscode.Disposable {
    console.log(`FBAFSProvider.watch(${uri.toString()}, ${JSON.stringify(options)})`)
    const watches = this._watches
    watches.push(uri)
    return {
      dispose() {
        console.log(`FBAFSProvider watch on '${uri.toString()}' disposed.`)
        const idx = watches.findIndex((v) => v.toString() === uri.toString())
        if (idx >= 0) {
          watches.splice(idx, 1)
        }
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

    const entry = this.getDataForUri(uri)
    if (entry) {
      console.log(`FBAFSProvider.stat size=${entry.stat.size} stat.mtime=${entry.stat.mtime}`)
      return entry.stat
    }
    throw vscode.FileSystemError.FileNotFound(uri)
  }

  readFile(uri: vscode.Uri): Uint8Array /* | Thenable<Uint8Array> */ {
    console.log(`FBAFSProvider.readFile(${uri.toString()})`)
    const entry = this.getDataForUri(uri)
    if (entry) {
      return entry.content
    }
    throw vscode.FileSystemError.FileNotFound(uri)
  }

  writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    options: { readonly create: boolean; readonly overwrite: boolean },
  ): void | Thenable<void> {
    console.log(`FBAFSProvider.writeFile nyi!(${uri.toString()}, content.length=${content.length}, options=${JSON.stringify(options)}})`)
    const entry = this.getDataForUri(uri)
    if (entry) {
      this.editEntry(entry, content)
    } else {
      throw vscode.FileSystemError.FileNotFound(uri)
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
