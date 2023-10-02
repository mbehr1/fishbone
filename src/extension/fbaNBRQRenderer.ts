/**
 * "render" (and update from cells) a restQuery to notebook cells
 *
 * todos:
 * [] allow adding of new rq cmds
 * [] allow deletion
 */
import * as vscode from 'vscode'

import * as JSON5 from 'json5'
import * as jp from 'jsonpath'

// import jju from 'jju'
const jju = require('jju')
import { RawNotebookCell } from './fbaNotebookProvider'
import { DocData, FBAEditorProvider, FBBadge } from './fbaEditor'
import { arrayEquals, getMemberParent, MemberPath } from './util'
import { NotebookCellOutput } from 'vscode'

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
/**
 * data for rendering a collapsible markdown text
 */
interface CollapsedMD {
  summary: string
  open?: boolean
  texts: (string | CollapsedMD)[]
}

const markdownTextFor = (textOrCollapsedMDs: (string | CollapsedMD)[]): string => {
  return textOrCollapsedMDs
    .map((textOrCollapsedMD) => {
      if (typeof textOrCollapsedMD === 'string') {
        return textOrCollapsedMD
      } else {
        if (textOrCollapsedMD.texts.length > 0) {
          return `<details${textOrCollapsedMD.open ? ' open' : ''}>
<summary>${textOrCollapsedMD.summary}</summary>

${markdownTextFor(textOrCollapsedMD.texts)}
</details>`
        } else {
          return textOrCollapsedMD.summary
        }
      }
    })
    .join('\n')
}

const appendMarkdown = (exec: vscode.NotebookCellExecution, texts: (string | CollapsedMD)[]) => {
  exec.appendOutput(new NotebookCellOutput([vscode.NotebookCellOutputItem.text(markdownTextFor(texts), 'text/markdown')]))
}

const codeBlock = (text: string, type?: string): string[] => {
  return ['```' + (type ? type : ''), text, '```']
}

export class FBANBRestQueryRenderer {
  static renderRestQuery(
    elem: string | FBBadge,
    fbUid: string,
    fbUidMembers: MemberPath,
    lastRawCells?: RawNotebookCell[],
  ): vscode.NotebookCellData[] {
    console.log(`FBANBRestQueryRenderer.renderRestQuery(${fbUid}, #lastRawCells=${lastRawCells ? lastRawCells.length : -1})`)
    const applyMode = typeof elem === 'string' // else badge with elem of FBBadge
    const filterString = applyMode ? elem : undefined
    const badge: FBBadge | undefined = !applyMode ? elem : undefined

    if (!badge && !filterString) {
      return []
    }
    const cells: vscode.NotebookCellData[] = []

    // todo instead of .source add source to fbUidMembers?
    const rq = rqUriDecode(badge ? badge.source : filterString!)

    cells.push(new FBANBRQCell(vscode.NotebookCellKind.Markup, rq.path, 'markdown', { fbUid, fbUidMembers }))
    for (const [cmdIdx, rqCmd] of rq.commands.entries()) {
      cells.push(new FBANBRQCell(vscode.NotebookCellKind.Markup, `${rqCmd.cmd}=`, 'markdown'))
      cells.push(
        new FBANBRQCell(vscode.NotebookCellKind.Code, rqCmd.param, 'jsonc', {
          fbUid,
          fbUidMembers: fbUidMembers.concat([cmdIdx.toString() + ':' + rqCmd.cmd]),
        }),
      )
      // conversionFunction included? we show them only if there is just 1. for more the hover needs to be used
      // or if they are part of lastRawCells (from last serialized one)

      let nrConvFunctions = 0
      let convCells: vscode.NotebookCellData[][] = []
      try {
        const obj = JSON5.parse(rqCmd.param)
        const objs = Array.isArray(obj) ? obj : [obj]
        for (const [idx, o] of objs.entries()) {
          if ('reportOptions' in o) {
            const rO = o.reportOptions
            if (rO && typeof rO === 'object' && 'conversionFunction' in rO) {
              nrConvFunctions += 1
              convCells.push(
                FBANBRestQueryRenderer.createMemberCell(
                  rO,
                  'conversionFunction',
                  `### conversionFunction` + '\n\n```function(matches, param){```',
                  {
                    fbUid,
                    fbUidMembers: fbUidMembers.concat([cmdIdx.toString() + ':' + rqCmd.cmd, idx, 'reportOptions']),
                  },
                ),
              )
            }
          }
        }
      } catch (e) {
        console.log(`FBANBRestQueryRenderer.renderRestQuery got e='${e}' parsing '${rqCmd.param}'`)
      }
      if (nrConvFunctions === 1) {
        cells.push(...convCells.flat())
      } else if (nrConvFunctions > 0) {
        // add any conv functions that have been prev. visible:
        if (lastRawCells) {
          console.log(`FBANBRestQueryRenderer.renderRestQuery checking ${lastRawCells.length} lastRawCells`)
          for (const convCellAr of convCells) {
            const convCell = convCellAr.find((cell) => cell.kind === vscode.NotebookCellKind.Code)
            if (
              convCell &&
              lastRawCells.find(
                (lastCell) =>
                  lastCell.metadata?.fbUid === convCell.metadata?.fbUid &&
                  arrayEquals(lastCell.metadata.fbUidMembers as MemberPath, convCell.metadata?.fbUidMembers as MemberPath),
              )
            ) {
              cells.push(...convCellAr)
              // console.log(`FBANBRestQueryRenderer.renderRestQuery lastRawCell found for ${JSON.stringify(convCell.metadata)}`)
            }
          }
        }
        // add a info cell
        cells.push(
          new vscode.NotebookCellData(
            vscode.NotebookCellKind.Markup,
            `${nrConvFunctions} conversionFunctions available. Use hover/tooltip to edit as cell.`,
            'markdown',
          ),
        )
      }
    }
    if (badge) {
      if (badge.jsonPath) {
        cells.push(
          new FBANBRQCell(vscode.NotebookCellKind.Code, `${badge.jsonPath}`, 'javascript', {
            fbUid,
            fbUidMembers: [...fbUidMembers, 'jsonPath'],
          }),
        )
      }
      if (badge.conv) {
        const convFunction = badge.conv
        const indexFirstC = convFunction.indexOf(':')
        const convType = convFunction.slice(0, indexFirstC) // length | index | func
        console.log(`FBANBRestQueryRenderer.renderRestQuery got badge.conv.${convType}`)
        if (convType === 'func') {
          const convParam = convFunction.slice(indexFirstC + 1)
          cells.push(new FBANBRQCell(vscode.NotebookCellKind.Markup, `### conversion function` + '\n\n```function(result){```', 'markdown'))
          cells.push(
            new FBANBRQCell(vscode.NotebookCellKind.Code, convParam, 'javascript', {
              fbUid,
              fbUidMembers: [...fbUidMembers, 'conv.func'],
            }),
          )
        }
      }
    }

    return cells
  }

  static createMemberCell(rO: Record<string, any>, member: string, mdTitle: string, metadata: any): vscode.NotebookCellData[] {
    const cells: vscode.NotebookCellData[] = []

    if (rO && typeof rO === 'object' && member in rO) {
      cells.push(new FBANBRQCell(vscode.NotebookCellKind.Markup, mdTitle, 'markdown'))
      cells.push(
        new FBANBRQCell(vscode.NotebookCellKind.Code, rO[member], 'javascript', {
          ...metadata,
          fbUidMembers: Array.isArray(metadata.fbUidMembers) ? metadata.fbUidMembers.concat([member]) : [member],
        }),
      )
    }
    return cells
  }

  static editRestQuery(
    elemObj: any,
    elemMember: string | number,
    fbUid: string,
    fbUidMembers: MemberPath,
    newCellData: RawNotebookCell[],
  ): boolean {
    console.log(
      `FBANBRestQueryRenderer.editRestQuery(fbUid=${fbUid}, ${fbUidMembers.join('.')} updating '${elemMember}') from ${
        newCellData.length
      } cells`,
    )
    // todo as we show the data redundantly (e.g. rqCmd.param and conversionFunction both could change at the same time...)

    // todo for now we do only support updating of existing rq and badge.jsonPath or conv.func...
    const applyMode = typeof elemObj[elemMember] === 'string' // else badge with elem of FBBadge
    const badge: FBBadge | undefined = !applyMode ? elemObj[elemMember] : undefined

    if (badge) {
      {
        const members = fbUidMembers.concat('jsonPath')
        const membersStr = members.join('/')
        const jpCell = newCellData.find(
          (c) =>
            c.metadata &&
            c.metadata.fbUid === fbUid &&
            Array.isArray(c.metadata.fbUidMembers) &&
            c.metadata.fbUidMembers.join('/') === membersStr,
        )
        if (jpCell) {
          const newJp = jpCell.value
          if (newJp !== badge.jsonPath) {
            // console.log(`FBANBRestQueryRenderer.editRestQuery changing jsonPath from '${badge.jsonPath}' to '${newJp}'`)
            badge.jsonPath = newJp
          }
        }
      }
      {
        const members = fbUidMembers.concat('conv.func')
        const membersStr = members.join('/')
        const convFuncCell = newCellData.find(
          (c) =>
            c.metadata &&
            c.metadata.fbUid === fbUid &&
            Array.isArray(c.metadata.fbUidMembers) &&
            c.metadata.fbUidMembers.join('/') === membersStr,
        )
        if (convFuncCell) {
          const newFn = convFuncCell.value ? 'func:' + convFuncCell.value : ''
          if (newFn !== badge.conv) {
            // console.log(`FBANBRestQueryRenderer.editRestQuery changing conv from '${badge.conv}' to '${newFn}'`)
            badge.conv = newFn
          }
        }
      }
    }
    const rq = rqUriDecode(applyMode ? elemObj[elemMember] : elemObj[elemMember].source)
    let didChangeRq = false
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
          didChangeRq = true
        } else {
          // only if no update we check for the conversionFunction...
          // conversionFunction included? todo generalize it for MemberPath!
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
              didChangeRq = true
            }
          } catch (e) {
            console.log(`FBANBRestQueryRenderer.renderRestQuery got e='${e}' parsing '${rqCmd.param}'`)
          }
        }
      } else {
        console.log(`FBANBRestQueryRenderer.editRestQuery no cell to update 'rqCmd'! (todo impl delete)`)
      }
    }
    if (didChangeRq) {
      // console.log(`FBANBRestQueryRenderer.editRestQuery updating rq:`)
      if (applyMode) {
        elemObj[elemMember] = rqUriEncode(rq)
      } else {
        elemObj[elemMember].source = rqUriEncode(rq)
      }
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
      if (fbUidMembers.length > 0) {
        const exec = nbController.createNotebookCellExecution(cell)
        exec.start()
        exec.clearOutput()
        try {
          if (fbUidMembers[fbUidMembers.length - 1] === 'conversionFunction') {
            const fnText = cell.document.getText()
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
                const query = JSON5.parse(queryCell.document.getText())
                if (Array.isArray(query)) {
                  const memberIdx = Number(fbUidMembers[fbUidMembers.length - 3])
                  const filter = query[memberIdx]
                  if (filter) {
                    const filterWoReportOptions = { ...filter, reportOptions: undefined, type: 0, tmpFb: undefined, maxNrMsgs: 5 }
                    appendMarkdown(exec, [
                      { summary: 'querying filter:', texts: [...codeBlock(JSON.stringify(filterWoReportOptions, undefined, 2), 'json')] },
                    ])
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
                      function (resJson: any) {
                        if ('error' in resJson) {
                          exec.appendOutput(
                            new NotebookCellOutput([vscode.NotebookCellOutputItem.stderr(`query got error:${resJson.error}`)]),
                          )
                        } else {
                          // msgs in resJson.data
                          try {
                            if ('data' in resJson && Array.isArray(resJson.data)) {
                              const msgs = (<any[]>resJson.data)
                                .filter((d: any) => d.type === 'msg')
                                .slice(0, 5)
                                .map((d: any) => d.attributes)

                              appendMarkdown(exec, [
                                {
                                  summary: `received ${resJson.data.length} messages${
                                    resJson.data.length > msgs.length
                                      ? `. Unfold to see first ${msgs.length}`
                                      : resJson.data.length > 0
                                      ? ':'
                                      : ''
                                  }`,
                                  texts: msgs.map((msg) => codeBlock(JSON.stringify(msg, undefined, 2), 'json')).flat(),
                                },
                              ])

                              // iterate through msgs, apply payloadRegex and pass matches to fn
                              const localObj = {}
                              const reportObj = {} // todo solution for multiple filters?
                              const regex = filterWoReportOptions.payloadRegex ? new RegExp(filterWoReportOptions.payloadRegex) : undefined
                              const textsMatches = []
                              const textsConverted = []
                              for (const msg of msgs) {
                                const matches = regex ? regex.exec(msg.payloadString) : []
                                textsMatches.push(codeBlock(JSON.stringify(matches, undefined, 2), 'json'))
                                const fnRes = fn(matches, { msg: msg, localObj, reportObj })
                                textsConverted.push(codeBlock(JSON.stringify(fnRes, undefined, 2)))
                              }
                              if (textsMatches.length > 0 || textsConverted.length > 0) {
                                appendMarkdown(exec, [{ summary: 'regex matches:', texts: textsMatches.flat() }])
                                appendMarkdown(exec, [
                                  { summary: 'conversionFunction returned:', open: true, texts: textsConverted.flat() },
                                ])
                              }
                            } else {
                              exec.appendOutput([
                                new NotebookCellOutput([vscode.NotebookCellOutputItem.stderr(`query got no data!`)]),
                                new NotebookCellOutput([vscode.NotebookCellOutputItem.json(resJson)]),
                              ])
                            }
                          } catch (e) {
                            exec.appendOutput(new NotebookCellOutput([vscode.NotebookCellOutputItem.stderr(`error: ${e}`)]))
                          }
                        }
                        exec.end(true)
                      },
                      (errTxt) => {
                        exec.appendOutput(new NotebookCellOutput([vscode.NotebookCellOutputItem.stderr(`query got error:${errTxt}`)]))
                        exec.end(true)
                      },
                    )
                  } else {
                    exec.appendOutput(new NotebookCellOutput([vscode.NotebookCellOutputItem.stderr(`filter not found!`)]))
                    exec.end(true)
                  }
                } else {
                  exec.appendOutput(new NotebookCellOutput([vscode.NotebookCellOutputItem.stderr(`querying filter no array!`)]))
                  exec.end(true)
                }
              } catch (e) {
                exec.appendOutput(new NotebookCellOutput([vscode.NotebookCellOutputItem.stderr(`querying filter got error:${e}`)]))
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
              exec.appendOutput(new NotebookCellOutput([vscode.NotebookCellOutputItem.stdout('compiles!')]))
              exec.end(true)
            }
          } else if (fbUidMembers[fbUidMembers.length - 1] === 'jsonPath') {
            const jsonPath = cell.document.getText()
            const queryCell = FBANBRestQueryRenderer.getCellByMembers(
              notebook,
              fbUidMembers.slice(0, fbUidMembers.length - 1).concat(['0:query']) /*.concat(['source'])*/,
            )
            if (queryCell) {
              const filter = JSON5.parse(queryCell.document.getText())
              appendMarkdown(exec, [{ summary: 'querying filter:', texts: [...codeBlock(JSON.stringify(filter, undefined, 2), 'json')] }])
              const filterRq: RQ = {
                path: 'ext:mbehr1.dlt-logs/get/docs/0/filters?', // todo get from cell data!
                commands: [
                  {
                    cmd: 'query',
                    param: JSON.stringify(filter),
                  },
                ],
              }
              FBANBRestQueryRenderer.execRestQuery(editorProvider, exec, docData, filterRq, jsonPath, '')
            } else {
              exec.appendOutput(
                new NotebookCellOutput([
                  vscode.NotebookCellOutputItem.stderr(
                    `cannot find cell ${JSON.stringify(fbUidMembers.slice(0, fbUidMembers.length - 1).concat(['source']))}`,
                  ),
                ]),
              )
              exec.end(true)
            }
          } else if (fbUidMembers[fbUidMembers.length - 1] === 'conv.func') {
            const convfunc = cell.document.getText()
            const jpCell = FBANBRestQueryRenderer.getCellByMembers(
              notebook,
              fbUidMembers.slice(0, fbUidMembers.length - 1).concat(['jsonPath']),
            )
            const jsonPath = jpCell ? jpCell.document.getText() : ''
            const queryCell = FBANBRestQueryRenderer.getCellByMembers(
              notebook,
              fbUidMembers.slice(0, fbUidMembers.length - 1).concat(['0:query']),
            )
            if (queryCell) {
              const filter = JSON5.parse(queryCell.document.getText())
              appendMarkdown(exec, [{ summary: 'querying filter:', texts: [...codeBlock(JSON.stringify(filter, undefined, 2), 'json')] }])
              const filterRq: RQ = {
                path: 'ext:mbehr1.dlt-logs/get/docs/0/filters?', // todo get from cell data!
                commands: [
                  {
                    cmd: 'query',
                    param: JSON.stringify(filter),
                  },
                ],
              }
              FBANBRestQueryRenderer.execRestQuery(
                editorProvider,
                exec,
                docData,
                filterRq,
                jsonPath,
                convfunc.length > 0 ? 'func:' + convfunc : convfunc,
              )
            } else {
              exec.appendOutput(
                new NotebookCellOutput([
                  vscode.NotebookCellOutputItem.stderr(
                    `cannot find cell ${JSON.stringify(fbUidMembers.slice(0, fbUidMembers.length - 1).concat(['source']))}`,
                  ),
                ]),
              )
              exec.end(true)
            }
          } else {
            exec.end(false)
          }
        } catch (e) {
          exec.appendOutput(new NotebookCellOutput([vscode.NotebookCellOutputItem.stderr(`got exception ${e}`)]))
          exec.end(false)
        }
      }
    }
  }

  static execRestQuery(
    editorProvider: FBAEditorProvider,
    exec: vscode.NotebookCellExecution,
    docData: DocData,
    rq: RQ,
    jsonPath: string,
    convFunction: string,
  ) {
    editorProvider.performRestQuery(docData, rqUriEncode(rq)).then(
      function (resJson: any) {
        if ('error' in resJson) {
          exec.appendOutput(
            new NotebookCellOutput([vscode.NotebookCellOutputItem.stderr(`query got error:${JSON.stringify(resJson.error)}`)]),
          )
        } else {
          if ('data' in resJson && Array.isArray(resJson.data)) {
            const msgs = (<any[]>resJson.data)
              .filter((d: any) => d.type === 'msg')
              .slice(0, 5)
              .map((d: any) => d.attributes)

            appendMarkdown(exec, [
              {
                summary: `received ${resJson.data.length} messages${
                  resJson.data.length > msgs.length ? `. Unfold to see first ${msgs.length}` : resJson.data.length > 0 ? ':' : ''
                }`,
                texts: msgs.map((msg) => codeBlock(JSON.stringify(msg, undefined, 2), 'json')).flat(),
              },
            ])

            let jpResult: any[] | undefined
            if (jsonPath.length > 0) {
              jpResult = jp.query({ ...resJson, data: msgs }, jsonPath) // we reduce msgs here to 5
              appendMarkdown(exec, [
                {
                  open: convFunction.length === 0,
                  summary: `after jsonpath conversion of ${jpResult.length} items:`,
                  texts: jpResult.map((msg) => codeBlock(JSON.stringify(msg, undefined, 2), 'json')).flat(),
                },
              ])
            }
            if (convFunction.length > 0) {
              const result = jsonPath.length > 0 ? jpResult : resJson
              const indexFirstC = convFunction.indexOf(':')
              const convType = convFunction.slice(0, indexFirstC)
              const convParam = convFunction.slice(indexFirstC + 1)
              let convResult: string | number | undefined
              switch (convType) {
                case 'length':
                  convResult = Array.isArray(result) ? result.length : 0
                  break
                case 'index':
                  convResult =
                    Array.isArray(result) && result.length > Number(convParam)
                      ? typeof result[Number(convParam)] === 'string'
                        ? result[Number(convParam)]
                        : JSON.stringify(result[Number(convParam)])
                      : 0
                  break
                case 'func':
                  try {
                    // eslint-disable-next-line no-new-func
                    if (!(globalThis as any).JSON5) {
                      ;(globalThis as any).JSON5 = JSON5
                    }
                    const fn = Function('result', convParam)
                    const fnRes = fn(result)
                    switch (typeof fnRes) {
                      case 'string':
                      case 'number':
                        convResult = fnRes
                        break
                      case 'object':
                        convResult = JSON.stringify(fnRes)
                        break
                      default:
                        convResult = `unknown result type '${typeof fnRes}'. Please return string or number`
                        break
                    }
                  } catch (e) {
                    convResult = `got error e='${e}' from conv function`
                  }
                  break
                default:
                  convResult = `unknown convType ${convType}`
                  break
              }
              appendMarkdown(exec, [
                {
                  open: true,
                  summary: `javascript function returns type '${typeof convResult}':`,
                  texts: [convResult !== undefined ? `${convResult}` : 'undefined'],
                },
              ])
            }
          }
        }
        exec.end(true)
      },
      (errTxt) => {
        console.log(`FBANBRestQueryRenderer.execRestQuery got error:`, errTxt)
        exec.appendOutput(new NotebookCellOutput([vscode.NotebookCellOutputItem.stderr(`query got error:${JSON.stringify(errTxt)}`)]))
        exec.end(true)
      },
    )
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

  static onCellCmd(cell: vscode.NotebookCell, cmd: string, args: any[]): void {
    console.log(
      `FBANBRestQueryRenderer.onCellCmd '${cmd}' docCell.metadata=${JSON.stringify(cell.metadata)} doc.metadata=${JSON.stringify(
        cell.notebook.metadata,
      )}`,
    )

    switch (cmd) {
      case 'showAsCell':
        const token = args[0]?.token as { stack: (number | string)[]; value: string }
        if (token) {
          console.log(`FBANBRestQueryRenderer.onCellCmd '${cmd}' token=${JSON.stringify(token)}, cell.index=${cell.index}`)
          // check whether a cell with that members path exists already
          const memberToShow = token.stack.concat(token.value)
          const memberFbUidMembers = cell.metadata.fbUidMembers.concat(memberToShow)
          const existingCellIdx = cell.notebook
            .getCells()
            .findIndex(
              (existingCell) =>
                existingCell.metadata?.fbUid === cell.metadata?.fbUid &&
                arrayEquals(existingCell.metadata.fbUidMembers as MemberPath, memberFbUidMembers),
            )
          if (existingCellIdx < 0) {
            // create a notebook edit
            // conversionFunction included?
            const cells: vscode.NotebookCellData[] = []
            try {
              const obj = JSON5.parse(cell.document.getText())
              const member = getMemberParent(obj, memberToShow)
              if (member) {
                const memberRef = memberToShow[memberToShow.length - 1] as string
                cells.push(
                  ...FBANBRestQueryRenderer.createMemberCell(
                    member,
                    memberRef,
                    `### ${memberRef}` + '\n\n```function(matches, param){```', // todo this needs to match exactly the initial creation text!
                    { ...cell.metadata, fbUidMembers: cell.metadata.fbUidMembers.concat(token.stack) },
                  ),
                )
              }
            } catch (e) {
              console.log(`FBANBRestQueryRenderer.onCellCmd got e='${e}'`)
            }
            if (cells.length) {
              const wsEdit = new vscode.WorkspaceEdit()
              const newCellIdx = cell.index + 1
              wsEdit.set(cell.notebook.uri, [
                new vscode.NotebookEdit(new vscode.NotebookRange(newCellIdx, newCellIdx) /* insert after cur cell */, cells),
              ])

              vscode.workspace.applyEdit(wsEdit).then((didApply) => {
                if (didApply) {
                  const activeNotebookEditor = vscode.window.activeNotebookEditor
                  if (activeNotebookEditor && activeNotebookEditor.notebook === cell.notebook) {
                    /*console.log(
                      `FBANBRestQueryRenderer.onCellCmd applyEdit revealing ${newCellIdx}-${newCellIdx + cells.length + 1}/${
                        cell.notebook.cellCount
                      }`,
                    )*/
                    activeNotebookEditor.revealRange(
                      new vscode.NotebookRange(newCellIdx, newCellIdx + cells.length),
                      vscode.NotebookEditorRevealType.InCenter,
                    )
                  }
                } else {
                  console.warn(`FBANBRestQueryRenderer.onCellCmd applyEdit failed!`)
                }
              })
            }
          } else {
            console.log(`FBANBRestQueryRenderer.onCellCmd '${cmd}': already visible. Revealing`)
            const activeNotebookEditor = vscode.window.activeNotebookEditor
            if (activeNotebookEditor && activeNotebookEditor.notebook === cell.notebook) {
              activeNotebookEditor.revealRange(
                new vscode.NotebookRange(existingCellIdx, existingCellIdx + 1),
                vscode.NotebookEditorRevealType.InCenter,
              )
            }
          }
        } else {
          console.warn(`FBANBRestQueryRenderer.onCellCmd '${cmd}': token missing!`, args)
        }
        break
      default:
        console.warn(`FBANBRestQueryRenderer.onCellCmd '${cmd}': cmd unknown!`)
    }
  }
}
