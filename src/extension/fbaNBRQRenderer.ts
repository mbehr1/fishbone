/**
 * "render" (and update from cells) a restQuery to notebook cells
 *
 * todos:
 * [] allow adding of new rq cmds
 * [] allow deletion
 */
import * as vscode from 'vscode'

import * as JSON5 from 'json5'
// import jju from 'jju'
const jju = require('jju')
import { RawNotebookCell } from './fbaNotebookProvider'
import { DocData, FBAEditorProvider } from './fbaEditor'

interface RQCmd {
  cmd: string
  param: any
}

interface RQ {
  path: string
  commands: RQCmd[]
}

const rqUriDecode = (rq: string): RQ => {
  const res: RQ = {
    path: '',
    commands: [],
  }
  if (!rq || rq.length === 0) {
    return res
  }

  const indexOfQ = rq?.indexOf('?')
  if (indexOfQ > 0) {
    res.path = rq.slice(0, indexOfQ + 1) // + '\n'

    const options = rq.slice(indexOfQ + 1)
    const optionArr = options.split('&')
    for (const commandStr of optionArr) {
      const eqIdx = commandStr.indexOf('=')
      const command = commandStr.slice(0, eqIdx)
      const commandParams = decodeURIComponent(commandStr.slice(eqIdx + 1))
      res.commands.push({ cmd: command, param: commandParams })
    }
  } else {
    res.path = rq
  }

  return res
}

const rqUriEncode = (rq: RQ): string => {
  let toRet = rq.path
  if (rq.commands.length > 0) {
    if (!toRet.endsWith('?')) {
      toRet += '?'
    }
    toRet += rq.commands.map((rqCmd) => rqCmd.cmd + '=' + encodeURIComponent(rqCmd.param)).join('&')
    /*
    for (const [idx, rqCmd] of rq.commands.entries()) {
      const cmdStr = rqCmd.cmd + '=' + encodeURIComponent(rqCmd.param)
      if (idx > 0) {
        toRet += '&'
      }
      toRet += cmdStr
    }*/
  }
  return toRet
}

class FBANBRQCell extends vscode.NotebookCellData {
  constructor(kind: vscode.NotebookCellKind, value: string, languageId: string, metadata?: object) {
    super(kind, value, languageId)
    super.metadata = {
      fbaRdr: 'FBANBRestQueryRenderer',
      ...metadata,
    }
  }
}

export class FBANBRestQueryRenderer {
  static renderRestQuery(elem: string, fbUid: string, fbUidMembers: string[]): vscode.NotebookCellData[] {
    console.log(`FBANBRestQueryRenderer.renderRestQuery(${fbUid})`)
    if (typeof elem !== 'string') {
      return []
    }
    const cells: vscode.NotebookCellData[] = []

    const rq = rqUriDecode(elem)

    cells.push(new FBANBRQCell(vscode.NotebookCellKind.Markup, rq.path, 'markdown', { fbUid, fbUidMembers }))
    for (const [cmdIdx, rqCmd] of rq.commands.entries()) {
      cells.push(new FBANBRQCell(vscode.NotebookCellKind.Markup, `${rqCmd.cmd}=`, 'markdown'))
      cells.push(
        new FBANBRQCell(vscode.NotebookCellKind.Code, rqCmd.param, 'jsonc', {
          fbUid,
          fbUidMembers: fbUidMembers.concat([cmdIdx.toString() + ':' + rqCmd.cmd]),
        }),
      )
      // conversionFunction included?
      try {
        const obj = JSON5.parse(rqCmd.param)
        const objs = Array.isArray(obj) ? obj : [obj]
        for (const [idx, o] of objs.entries()) {
          if ('reportOptions' in o) {
            const rO = o.reportOptions
            if (rO && typeof rO === 'object' && 'conversionFunction' in rO) {
              cells.push(
                new FBANBRQCell(vscode.NotebookCellKind.Markup, 'conversionFunction:\n\n```function(matches, param){```', 'markdown'),
              )
              cells.push(
                new FBANBRQCell(vscode.NotebookCellKind.Code, rO.conversionFunction, 'javascript', {
                  fbUid,
                  fbUidMembers: fbUidMembers.concat([
                    cmdIdx.toString() + ':' + rqCmd.cmd,
                    idx.toString(),
                    'reportOptions',
                    'conversionFunction',
                  ]),
                }),
              )
            }
          }
        }
      } catch (e) {
        console.log(`FBANBRestQueryRenderer.renderRestQuery got e='${e}' parsing '${rqCmd.param}'`)
      }
    }

    return cells
  }

  static editRestQuery(elemObj: any, elemMember: string, fbUid: string, fbUidMembers: string[], newCellData: RawNotebookCell[]): boolean {
    console.log(
      `FBANBRestQueryRenderer.editRestQuery(fbUid=${fbUid}, ${fbUidMembers.join('.')} updating '${elemMember}') from ${
        newCellData.length
      } cells`,
    )
    // todo as we show the data redundantly (e.g. rqCmd.param and conversionFunction both could change at the same time...)

    // todo for now we do only support updating of existing rq...
    const rq = rqUriDecode(elemObj[elemMember])
    let didChange = false
    for (const [cmdIdx, rqCmd] of rq.commands.entries()) {
      // do we have a cell with metadata for this entry?
      const members = fbUidMembers.concat([cmdIdx.toString() + ':' + rqCmd.cmd])
      const membersStr = members.join('/')
      const cell = newCellData.find(
        (c) =>
          c.metadata &&
          c.metadata.fbUid === fbUid &&
          Array.isArray(c.metadata.fbUidMembers) &&
          c.metadata.fbUidMembers.join('/') === membersStr,
      )
      if (cell) {
        // console.log(`FBANBRestQueryRenderer.editRestQuery got a cell to update rqCmd #${cmdIdx} '${rqCmd.cmd}': cell=`, cell)
        if (rqCmd.param !== cell.value) {
          console.log(`FBANBRestQueryRenderer.editRestQuery new value for rqCmd #${cmdIdx} '${rqCmd.cmd}': '${cell.value}'`)
          // todo check for same language kind...
          // todo check whether its a valid json5? (except the special commands? (delete=view...))
          rqCmd.param = cell.value
          didChange = true
        } else {
          // only if no update we check for the conversionFunction...
          // conversionFunction included?
          try {
            // here we should use jju.update to keep json5 format/comments,...
            const obj = JSON5.parse(rqCmd.param)
            const objs = Array.isArray(obj) ? obj : [obj]
            let didChangeO = false
            for (const [idx, o] of objs.entries()) {
              if ('reportOptions' in o) {
                const rO = o.reportOptions
                if (rO && typeof rO === 'object' && 'conversionFunction' in rO) {
                  const members = fbUidMembers.concat([
                    cmdIdx.toString() + ':' + rqCmd.cmd,
                    idx.toString(),
                    'reportOptions',
                    'conversionFunction',
                  ])
                  const membersStr = members.join('/')
                  const cell = newCellData.find(
                    (c) =>
                      c.metadata &&
                      c.metadata.fbUid === fbUid &&
                      Array.isArray(c.metadata.fbUidMembers) &&
                      c.metadata.fbUidMembers.join('/') === membersStr,
                  )
                  if (cell) {
                    // console.log(`FBANBRestQueryRenderer.editRestQuery got a cell to update '${membersStr}'`, cell)
                    if (rO.conversionFunction !== cell.value) {
                      console.log(`FBANBRestQueryRenderer.editRestQuery new value for ${membersStr}: '${cell.value}'`)
                      rO.conversionFunction = cell.value
                      didChangeO = true
                    }
                  }
                }
              }
            }
            if (didChangeO) {
              // serialize
              //rqCmd.param = JSON.stringify(obj)
              rqCmd.param = jju.update(rqCmd.param, obj, { mode: 'json5' })
              didChange = true
            }
          } catch (e) {
            console.log(`FBANBRestQueryRenderer.renderRestQuery got e='${e}' parsing '${rqCmd.param}'`)
          }
        }
      } else {
        console.log(`FBANBRestQueryRenderer.editRestQuery no cell to update 'rqCmd'! (todo impl delete)`)
      }
    }
    if (didChange) {
      // console.log(`FBANBRestQueryRenderer.editRestQuery updating rq:`)
      elemObj[elemMember] = rqUriEncode(rq)
    }
    return true
  }

  /**
   * execute a single cell that was created by us (todo change way to detect that (e.g. via metadata))
   * @param nbController
   * @param cell
   * @param notebook
   */
  static executeCell(
    nbController: vscode.NotebookController,
    cell: vscode.NotebookCell,
    notebook: vscode.NotebookDocument,
    docData: DocData,
    editorProvider: FBAEditorProvider,
  ): void {
    console.log(`FBANBRestQueryRenderer.executeCell()... cell.metadata=${JSON.stringify(cell.metadata)}`)
    if (
      cell.kind === vscode.NotebookCellKind.Code &&
      cell.document.languageId === 'javascript' &&
      cell.metadata &&
      cell.metadata.fbUidMembers &&
      Array.isArray(cell.metadata.fbUidMembers)
    ) {
      const fbUidMembers = <string[]>cell.metadata.fbUidMembers
      if (fbUidMembers.length > 0 && fbUidMembers[fbUidMembers.length - 1] === 'conversionFunction') {
        const exec = nbController.createNotebookCellExecution(cell)
        exec.start()
        exec.clearOutput()
        const fnText = cell.document.getText()
        try {
          // add global json5...
          if (!(globalThis as any).JSON5) {
            ;(globalThis as any).JSON5 = JSON5
          }

          const fn = Function('matches,params', fnText)
          // do a restQuery for the filter surrounded.
          const queryCell = FBANBRestQueryRenderer.getCellByMembers(notebook, fbUidMembers.slice(0, fbUidMembers.length - 3))
          //console.log(`FBANBRestQueryRenderer.executeCell()... found queryCell=${JSON.stringify(queryCell)}`)
          if (queryCell) {
            try {
              exec.appendOutput(new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.stdout('querying filter...')]))
              const query = JSON5.parse(queryCell.document.getText())
              if (Array.isArray(query)) {
                const memberIdx = Number(fbUidMembers[fbUidMembers.length - 3])
                const filter = query[memberIdx]
                if (filter) {
                  const filterWoReportOptions = { ...filter, reportOptions: undefined, type: 0, tmpFb: undefined, maxNrMsgs: 3 }
                  exec.appendOutput(new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.json(filterWoReportOptions)]))
                  // todo: this contains a lot on code with internals from dlt-logs. Should move to a lib or completely as a
                  // new restQuery to dlt-logs.
                  const filterRq: RQ = {
                    path: 'ext:mbehr1.dlt-logs/get/docs/0/filters?', // todo get from cell data!
                    commands: [
                      {
                        cmd: 'query',
                        param: JSON.stringify([filterWoReportOptions]),
                      },
                    ],
                  }
                  editorProvider.performRestQuery(docData, rqUriEncode(filterRq)).then(
                    (resJson) => {
                      if ('error' in resJson) {
                        exec.appendOutput(
                          new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.stderr(`query got error:${resJson.error}`)]),
                        )
                      } else {
                        // msgs in resJson.data
                        try {
                          if ('data' in resJson && Array.isArray(resJson.data)) {
                            exec.appendOutput(
                              new vscode.NotebookCellOutput([
                                vscode.NotebookCellOutputItem.stdout(`received ${resJson.data.length} messages, first 3:`),
                              ]),
                            )
                            const msgs = (<any[]>resJson.data)
                              .filter((d: any) => d.type === 'msg')
                              .slice(0, 3)
                              .map((d: any) => d.attributes)
                            exec.appendOutput(new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.json(msgs)]))
                            // iterate through msgs, apply payloadRegex and pass matches to fn
                            const localObj = {}
                            const reportObj = {} // todo solution for multiple filters?
                            const regex = filterWoReportOptions.payloadRegex ? new RegExp(filterWoReportOptions.payloadRegex) : undefined
                            for (const msg of msgs) {
                              const matches = regex ? regex.exec(msg.payloadString) : []
                              exec.appendOutput(new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.json({ matches: matches })]))
                              const fnRes = fn(matches, { msg: msg, localObj, reportObj })
                              exec.appendOutput(new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.json(fnRes)]))
                            }
                          } else {
                            exec.appendOutput(
                              new vscode.NotebookCellOutput([
                                vscode.NotebookCellOutputItem.stderr(`query got no data!`),
                                vscode.NotebookCellOutputItem.json(resJson),
                              ]),
                            )
                          }
                        } catch (e) {
                          exec.appendOutput(new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.stderr(`error: ${e}`)]))
                        }
                      }
                      exec.end(true)
                    },
                    (errTxt) => {
                      exec.appendOutput(new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.stderr(`query got error:${errTxt}`)]))
                      exec.end(true)
                    },
                  )
                } else {
                  exec.appendOutput(new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.stderr(`filter not found!`)]))
                  exec.end(true)
                }
              } else {
                exec.appendOutput(new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.stderr(`querying filter no array!`)]))
                exec.end(true)
              }
            } catch (e) {
              exec.appendOutput(new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.stderr(`querying filter got error:${e}`)]))
              exec.end(true)
            }
          } else {
            const matches: any[] = []
            const params = {
              msg: { payloadString: 'example msg.payloadString', ecu: 'ECU1', apid: 'APID', ctid: 'CTID' },
              localObj: {},
              reportObj: {},
            }
            fn(matches, params)
            exec.appendOutput(new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.stdout('compiles!')]))
            exec.end(true)
          }
        } catch (e) {
          exec.appendOutput(new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.stderr(`got exception ${e}`)]))
          exec.end(false)
        }
      }
    }
  }

  /**
   * return the cell with the (exactly) matching fbUidMembers
   * @param notebook
   * @param members
   * @returns
   */
  static getCellByMembers(notebook: vscode.NotebookDocument, members: string[]): vscode.NotebookCell | undefined {
    const cell = notebook.getCells().find((cell) => {
      if (cell.metadata && cell.metadata.fbUidMembers && Array.isArray(cell.metadata.fbUidMembers)) {
        const fbUidMembers = <string[]>cell.metadata.fbUidMembers
        if (fbUidMembers.length !== members.length) {
          return false
        } else {
          for (const [idx, member] of members.entries()) {
            if (fbUidMembers.at(idx) !== member) {
              return false
            }
          }
          return true
        }
      }
      return false
    })
    return cell
  }
}
