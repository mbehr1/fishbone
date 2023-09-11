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
    toRet += rq.commands.map((rqCmd) => rqCmd + '=' + encodeURIComponent(rqCmd.param)).join('&')
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

export class FBANBRestQueryRenderer {
  static renderRestQuery(elem: string, fbUid: string, fbUidMembers: string[]): vscode.NotebookCellData[] {
    console.log(`FBANBRestQueryRenderer.renderRestQuery(${fbUid})`)
    if (typeof elem !== 'string') {
      return []
    }
    const cells: vscode.NotebookCellData[] = []

    const rq = rqUriDecode(elem)

    cells.push(new vscode.NotebookCellData(vscode.NotebookCellKind.Markup, rq.path, 'markdown'))
    // doesn't seem to have an impact. cells[cells.length - 1].metadata = { editable: false, deleteable: false, trusted: true }
    for (const [cmdIdx, rqCmd] of rq.commands.entries()) {
      cells.push(new vscode.NotebookCellData(vscode.NotebookCellKind.Markup, `${rqCmd.cmd}=`, 'markdown'))
      cells.push(new vscode.NotebookCellData(vscode.NotebookCellKind.Code, rqCmd.param, 'jsonc'))
      cells[cells.length - 1].metadata = {
        fbUid,
        fbUidMembers: fbUidMembers.concat([cmdIdx.toString() + ':' + rqCmd.cmd]),
      }
      // conversionFunction included?
      try {
        const obj = JSON5.parse(rqCmd.param)
        const objs = Array.isArray(obj) ? obj : [obj]
        for (const [idx, o] of objs.entries()) {
          if ('reportOptions' in o) {
            const rO = o.reportOptions
            if (rO && typeof rO === 'object' && 'conversionFunction' in rO) {
              cells.push(
                new vscode.NotebookCellData(
                  vscode.NotebookCellKind.Markup,
                  'conversionFunction:\n\n```function(matches, param){```',
                  'markdown',
                ),
              )
              cells.push(new vscode.NotebookCellData(vscode.NotebookCellKind.Code, rO.conversionFunction, 'javascript'))
              cells[cells.length - 1].metadata = {
                fbUid,
                fbUidMembers: fbUidMembers.concat([
                  cmdIdx.toString() + ':' + rqCmd.cmd,
                  idx.toString(),
                  'reportOptions',
                  'conversionFunction',
                ]),
              }
            }
          }
        }
      } catch (e) {
        console.log(`FBANBRestQueryRenderer.renderRestQuery got e='${e}' parsing '${rqCmd.param}'`)
      }
    }

    if (cells.length > 0) {
      cells[0].metadata = { fbUid, fbUidMembers }
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
}
