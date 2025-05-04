/**
 * copyright (c) 2025, Matthias Behr
 *
 * todo:
 * [x] - support Sequences
 * [x] - support nested root causes
 * [x] - provide generic log infos like timeframe covered in logs, lifecycles detected, nr of ecus...
 * [x] - (done via tool QueryLogs) access to logs (e.g. via details for badges or from "apply filter" ones...)
 * [ ] - add info to current attributes fo FishboneContext
 * [ ] - provide resume times for lifecycles (needs to be added to dlt-logs rest query 'ecus' first)
 * [ ] - add "overview" alike categories?
 * [ ] - understand iterations, test-cases based on log markers
 * [ ] - new links to rootcause? (to have just 1 root cause being part of multiple effects)
 * [ ] - allow to set attributes (e.g. restrict ecus, restrict lifecycles)
 * [ ] - new attribute to restrict timerange?
 * [ ] - support a user/workspace specific knowledge base? (e.g. ecu a = ECU1+ECU2 in logs)
 * [ ] - split ToolResults by priority (e.g. ok sequences -> summary only if at token limit)
 * [ ] - add tool to apply filter frags
 * [ ] - add tool to export a log based on e.g. lc, time range, ecu, filter,...
 * [ ] - support change of active restquerydoc...
 * [ ] - add help related features (help on creating a report, on filtering, ...)
 * [ ] - add support for report filters (image capturing... uploading...)?
 */

import * as vscode from 'vscode'
import * as jp from 'jsonpath/jsonpath.min.js'
import * as JSON5 from 'json5'
import TelemetryReporter from '@vscode/extension-telemetry'
import { renderPrompt } from '@vscode/prompt-tsx'
import { FBAIPrompt, ToolCallRound, ToolResultMetadata } from './fbAiHistory'
import { DocData, FBAEditorProvider } from './fbaEditor'
import { QueryLogsTool, RootcauseDetailsTool } from './fbAiTools'
import { FBBadge, FBEffect, FBRootCause, Fishbone } from './fbaFormat'
import { RQ, RQCmd, rqUriDecode } from 'dlt-logs-utils/restQuery'
import { DltFilter, FbSequenceResult, SeqChecker } from 'dlt-logs-utils/sequence'
import { FBANBRestQueryRenderer } from './fbaNBRQRenderer'
import { IFBsToInclude } from './fbAiFishboneContext'

interface IFaiChatResult extends vscode.ChatResult {
  metadata: TsxToolUserMetadata
}

export interface TsxToolUserMetadata {
  command?: string
  toolCallsMetadata: ToolCallsMetadata
}

export interface ToolCallsMetadata {
  toolCallRounds: ToolCallRound[]
  toolCallResults: Record<string, vscode.LanguageModelToolResult>
}

export function isTsxToolUserMetadata(obj: unknown): obj is TsxToolUserMetadata {
  // If you change the metadata format, you would have to make this stricter or handle old objects in old ChatRequest metadata
  return (
    !!obj &&
    !!(obj as TsxToolUserMetadata).toolCallsMetadata &&
    Array.isArray((obj as TsxToolUserMetadata).toolCallsMetadata.toolCallRounds)
  )
}

// if registration of our own tools is not possible, we can call them directly
export interface IOwnTools {
  tool: vscode.LanguageModelTool<any>
  info: vscode.LanguageModelToolInformation
}

export class FBAIProvider implements vscode.Disposable {
  ownToolInfos: IOwnTools[] = []

  constructor(
    private readonly context: vscode.ExtensionContext,
    private editorProvider: FBAEditorProvider,
    private readonly reporter?: TelemetryReporter,
  ) {
    try {
      console.log('FBAIProvider()...')
      const fai = vscode.chat.createChatParticipant('fishbone.ai', this.handleChatRequest.bind(this))
      fai.iconPath = vscode.Uri.joinPath(context.extensionUri, 'fishbone-icon2.png')
      const providerFollowup = this.provideFollowups.bind(this)
      fai.followupProvider = {
        provideFollowups(
          result: IFaiChatResult,
          context: vscode.ChatContext,
          token: vscode.CancellationToken,
        ): vscode.ProviderResult<vscode.ChatFollowup[]> {
          return providerFollowup(result, context, token)
        },
      }
      context.subscriptions.push(fai)
      context.subscriptions.push(vscode.lm.registerTool('fishbone_rootcauseDetails', new RootcauseDetailsTool(this)))
      context.subscriptions.push(vscode.lm.registerTool('fishbone_queryLogs', new QueryLogsTool(this)))
      // lets see whether we can use our own tool (or whether access is eg. restricted):
      const fbTools = vscode.lm.tools.filter((tool) => tool.tags.includes('fishbone'))
      if (fbTools.length > 0) {
        console.log(`FBAIProvider() found ${fbTools.length} fishbone tools:`, fbTools)
      } else {
        try {
          const ownLmToolsInfo = context.extension.packageJSON.contributes?.languageModelTools
          console.warn(`FBAIProvider() no fishbone tools found but found ${ownLmToolsInfo?.length} own tools in package.json`)
          const ownLmToolsMapped: vscode.LanguageModelToolInformation[] =
            ownLmToolsInfo && Array.isArray(ownLmToolsInfo)
              ? ownLmToolsInfo.map((tool: any) => {
                  return {
                    name: tool.name,
                    tags: tool.tags,
                    description: tool.modelDescription,
                    inputSchema: tool.inputSchema,
                  }
                })
              : []
          for (const toolInfo of ownLmToolsMapped) {
            switch (toolInfo.name) {
              case 'fishbone_rootcauseDetails':
                this.ownToolInfos.push({
                  tool: new RootcauseDetailsTool(this),
                  info: toolInfo,
                })
                break
              case 'fishbone_queryLogs':
                this.ownToolInfos.push({
                  tool: new QueryLogsTool(this),
                  info: toolInfo,
                })
                break
              default:
                console.warn(`FBAIProvider() unknown tool name '${toolInfo.name}' in package.json`)
                break
            }
          }
        } catch (e) {
          console.warn(`FBAIProvider() error while reading own tools from package.json: ${e}`)
        }
        console.log(`FBAIProvider() providing ${this.ownToolInfos.length} own tools`)
      }
      console.log('FBAIProvider() done.')
    } catch (e) {
      console.error('FBAIProvider constructor error:', e)
    }
  }
  dispose() {
    console.log('FBAIProvider disposed')
  }

  async handleChatRequest(
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken,
  ): Promise<IFaiChatResult> {
    console.log(
      `FBAIProvider.handleChatRequest(req.command='${request.command}' req.prompt='${request.prompt}' req.model.id='${
        request.model.id
      }') req.model=${JSON.stringify(request.model)}...`,
    )
    // todo how to check whether the model supports tools?

    if (request.command === 'list') {
      stream.markdown(`Available tools: ${vscode.lm.tools.map((tool) => tool.name).join(', ')}\n\n`)
      // own tools:
      stream.markdown(
        `Own tools:\n\n\`\`\`json\n\n${[...vscode.lm.tools, ...this.ownToolInfos.map((t) => t.info)]
          .filter((tool) => tool.tags.includes('fishbone'))
          .map((tool) => JSON.stringify(tool, undefined, 2))
          .join(',\n')}\n\`\`\`\n\n`,
      )
      return {
        metadata: { command: request.command, toolCallsMetadata: { toolCallRounds: [], toolCallResults: {} } },
      }
    } else if (request.command === undefined || request.command === 'analyse') {
      // TODO: how to detect a follow up chat vs. a new chat (e.g. with new logs/fbs)?

      const tools = vscode.lm.tools.filter((tool) => tool.tags.includes('fishbone'))
      tools.push(...this.ownToolInfos.map((t) => t.info))
      const fbs: IFBsToInclude[] = this.editorProvider._treeRootNodes
        .map((node) => {
          return node.docData?.lastPostedObj !== undefined ? ({ fb: node.docData.lastPostedObj } as IFBsToInclude) : undefined
        })
        .filter((node) => node !== undefined)

      stream.progress(`Analysing using ${fbs.length} fishbones using ${tools.length} tools...`)
      try {
        const prompt = await renderPrompt(
          FBAIPrompt, // ctor
          {
            userQuery: request.prompt,
            history: context.history,
            ownTools: this.ownToolInfos,
            provider: this,
            activeDocUri: this.editorProvider._lastActiveRestQueryDoc.uri,
            fbs,
            toolCallRounds: [],
            toolCallResults: {},
            toolInvocationToken: request.toolInvocationToken,
          }, // props
          { modelMaxPromptTokens: request.model.maxInputTokens }, // endpoint
          request.model, // tokenizerMetadata
          /*undefined, // progress
          token, // cancellationToken
          OutputMode.VSCode // outputMode*/
        )
        let messages = prompt.messages

        console.log(
          `FBAIProvider.handleChatRequest(req.command='${request.command}' req.prompt='${request.prompt}' req.model.id='${request.model.id}') rendered prompt: #messages=${messages.length} with ${prompt.tokenCount} tokens`,
        )

        prompt.references.forEach((ref) => {
          if (ref.anchor instanceof vscode.Uri || ref.anchor instanceof vscode.Location) {
            stream.reference(ref.anchor)
          }
        })
        // log the messages:
        /*for (const m of messages) {
          console.log(`FBAIProvider.handleChatRequest() message: ${JSON.stringify(m)}`)
        }*/

        const toolReferences = [...request.toolReferences]
        const accumulatedToolResults: Record<string, vscode.LanguageModelToolResult> = {}
        const toolCallRounds: ToolCallRound[] = []
        const options: vscode.LanguageModelChatRequestOptions = {
          justification: 'To make a request to @fishbone.ai tools',
        }
        const runWithTools = async (): Promise<void> => {
          // If a toolReference is present, force the model to call that tool
          const requestedTool = toolReferences.shift()
          if (requestedTool) {
            options.toolMode = vscode.LanguageModelChatToolMode.Required
            options.tools = [...vscode.lm.tools, ...this.ownToolInfos.map((t) => t.info)].filter((tool) => tool.name === requestedTool.name)
          } else {
            options.toolMode = undefined
            options.tools = [...tools]
          }
          let realNrTokens = 0
          for (const m of messages) {
            realNrTokens += await request.model.countTokens(m)
          }
          console.log(`FBAIProvider realNrTokens = ${realNrTokens}`)
          const chatResponse = await request.model.sendRequest(messages, options, token)
          console.log(
            `FBAIProvider.handleChatRequest(req.command='${request.command}' req.prompt='${request.prompt}' req.model.id='${request.model.id}') request sent`,
          )
          let nrFragements = 0
          const toolCalls: vscode.LanguageModelToolCallPart[] = []
          let responseStr = ''
          for await (const part of chatResponse.stream) {
            if (part instanceof vscode.LanguageModelTextPart) {
              stream.markdown(part.value)
              responseStr += part.value
            } else if (part instanceof vscode.LanguageModelToolCallPart) {
              toolCalls.push(part)
            }
            nrFragements++
          }
          if (toolCalls.length) {
            // If the model called any tools, then we do another round- render the prompt with those tool calls (rendering the PromptElements will invoke the tools)
            // and include the tool results in the prompt for the next request.
            toolCallRounds.push({
              response: responseStr,
              toolCalls,
            })
            const result = await renderPrompt(
              FBAIPrompt, // ctor
              {
                userQuery: request.prompt,
                ownTools: this.ownToolInfos,
                history: context.history,
                provider: this,
                activeDocUri: this.editorProvider._lastActiveRestQueryDoc.uri,
                fbs,
                toolCallRounds,
                toolCallResults: accumulatedToolResults,
                toolInvocationToken: request.toolInvocationToken,
              }, // props
              { modelMaxPromptTokens: request.model.maxInputTokens }, // endpoint
              request.model, // tokenizerMetadata
            )
            console.log(
              `FBAIProvider.handleChatRequest() rendered prompt with tool calls: #messages=${result.messages.length} with ${result.tokenCount} tokens`,
            )
            messages = result.messages
            /*for (const m of messages) {
              console.log(`FBAI messages after tool renderPrompt:`,m)
            }*/
            const toolResultMetadata = result.metadata.getAll(ToolResultMetadata)
            // console.log(`FBAI handleChatRequest got ${toolResultMetadata.length} toolResultMetadata`, toolResultMetadata)
            if (toolResultMetadata?.length) {
              // Cache tool results for later, so they can be incorporated into later prompts without calling the tool again
              toolResultMetadata.forEach((meta) => (accumulatedToolResults[meta.toolCallId] = meta.result))
            }
            // This loops until the model doesn't want to call any more tools, then the request is done.
            return runWithTools()
          }
        }

        await runWithTools()

        return {
          metadata: {
            command: request.command,
            // Return tool call metadata so it can be used in prompt history on the next request
            toolCallsMetadata: {
              toolCallResults: accumulatedToolResults,
              toolCallRounds,
            },
          } satisfies TsxToolUserMetadata,
        }
      } catch (err) {
        console.error('Error in FBAIProvider.handleChatRequest:', err)
        stream.progress(`oops. got an error: ${err}`)
        //handleError(logger, err, stream);
      }

      // this.reporter?.logUsage('request', { kind: 'play' });
      return { metadata: { command: request.command, toolCallsMetadata: { toolCallRounds: [], toolCallResults: {} } } }
    }
    return {
      errorDetails: { message: 'not implemented yet', responseIsFiltered: false },
      metadata: { command: request.command },
    } as IFaiChatResult
  }

  provideFollowups(
    result: IFaiChatResult,
    context: vscode.ChatContext,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.ChatFollowup[]> {
    console.log(`FBAIProvider.provideFollowups(r.m.cmd=${result.metadata.command})...`)
    return []
  }

  // # region support functions for fishbone access:
  static iterateAllFBElements(fishbone: FBEffect[], parents: any[], fn: (type: string, elem: any, parent: any) => void) {
    for (const effect of fishbone) {
      fn('effect', effect, fishbone)
      if (effect?.categories?.length) {
        for (const category of effect.categories) {
          fn('category', category, effect)
          if (category?.rootCauses?.length) {
            for (const rc of category.rootCauses) {
              fn('rc', rc, category)
              if (rc.type === 'nested') {
                if (rc.data !== undefined) {
                  FBAIProvider.iterateAllFBElements(rc.data, [...parents, rc], fn)
                }
              }
            }
          }
        }
      }
    }
  }
  public getRootCause(fb: Fishbone, fbUid: string): FBRootCause | undefined {
    let found: FBRootCause | undefined = undefined
    FBAIProvider.iterateAllFBElements(fb.fishbone, [], (type: string, elem: any, parent: any) => {
      if (type === 'rc' && elem.fbUid === fbUid) {
        found = elem
      }
    })
    return found
  }

  public getFishbones(): DocData[] {
    return this.editorProvider._treeRootNodes
      .map((node) => (node.docData?.lastPostedObj ? node.docData : undefined))
      .filter((node) => node !== undefined) as DocData[]
  }

  public performRestQueryUri(url: string) {
    return this.editorProvider.performRestQueryUri(url)
  }

  public performRestQuery(docData: DocData, rq: RQ) {
    return this.editorProvider.performRestQuery(docData, rq)
  }

  public substFilterAttributes(docData: DocData, filters: any[]) {
    return this.editorProvider.substFilterAttributes(docData, filters)
  }

  public async evaluateRestQuery(docData: DocData, badge: FBBadge) {
    if (badge.conv && badge.source && typeof badge.source === 'string' && badge.source.startsWith('ext:mbehr1.dlt-logs/')) {
      try {
        const rq = rqUriDecode(badge.source)
        // for now always evaluate the first command that returns a value
        for (const cmd of rq.commands) {
          if (cmd.cmd === 'query') {
            // todo what if multiple queries?
            return this.performRestQuery(docData, rq).then(
              (resJson) => {
                //console.log(`FBAI evaluateRestQuery got resJson`)
                let answer: { jsonPathResult?: any[]; convResult?: number | string; restQueryResult: any } = { restQueryResult: resJson }
                let result = resJson
                if (badge.jsonPath && badge.jsonPath.length > 0) {
                  result = jp.query(resJson, badge.jsonPath)
                  //console.log(`FBAI evaluateRestQuery queried jsonPath`)
                  answer.jsonPathResult = result
                }
                if (badge.conv && badge.conv.length > 0) {
                  const dataConv = badge.conv
                  const indexFirstC = dataConv.indexOf(':')
                  const convType = dataConv.slice(0, indexFirstC)
                  const convParam = dataConv.slice(indexFirstC + 1)
                  // console.log(`convType='${convType}' convParam='${convParam}' result=`, result);
                  switch (convType) {
                    case 'length':
                      answer.convResult = Array.isArray(result) ? result.length : 0
                      // console.log(`conv length from ${JSON.stringify(result)} returns '${JSON.stringify(answer.convResult)}'`);
                      break
                    case 'index':
                      answer.convResult =
                        Array.isArray(result) && result.length > Number(convParam)
                          ? typeof result[Number(convParam)] === 'string'
                            ? result[Number(convParam)]
                            : JSON.stringify(result[Number(convParam)])
                          : 0
                      break
                    case 'func':
                      // todo try catch... conv to string/number
                      try {
                        // eslint-disable-next-line no-new-func
                        const fn = new Function('result', convParam)
                        const fnRes = fn(result)
                        //console.log(`typeof fnRes='${typeof fnRes}'`);
                        switch (typeof fnRes) {
                          case 'string':
                          case 'number':
                            answer.convResult = fnRes
                            break
                          case 'object':
                            answer.convResult = JSON.stringify(fnRes)
                            break
                          default:
                            answer.convResult = `unknown result type '${typeof fnRes}'. Please return string or number`
                            break
                        }
                      } catch (e) {
                        answer.convResult = `got error e='${e}' from conv function`
                      }
                      break
                    default:
                      answer.convResult = `unknown convType ${convType}`
                      break
                  }
                }
                result =
                  answer.convResult !== undefined
                    ? answer.convResult
                    : answer.jsonPathResult !== undefined
                      ? answer.jsonPathResult
                      : answer.restQueryResult
                return result
              },
              (rejectReason) => {},
            )
          } else if (cmd.cmd === 'sequences') {
            // for now we do implement it here (again) instead of using the dlt-logs sequence
            // and adding e.g. seqDetails and some sequence.scopes... to enable details
            // We do this to e.g. later support providing a summary only for a single occurrence
            // to avoid largely nested tables/markdowns.
            const r = await this.evaluateSequence(docData, rq, cmd)
            if (r !== undefined) {
              return r
            } // else ignore
          } else {
            console.log(`rq.cmd=${cmd} ignored!`)
          }
        }
      } catch (e) {
        console.warn(`evaluateRestQuery got error:${e}`)
      }
    }
  }

  private async evaluateSequence(docData: DocData, rq: RQ, cmd: RQCmd) {
    try {
      const maxNrMsgs = 1_000_000
      const sequences = JSON5.parse(cmd.param)
      if (Array.isArray(sequences) && sequences.length > 0) {
        // code similar to fbaNBRQRenderer.executeSequences... (todo refactor)
        const resPromises = []
        for (const jsonSeq of sequences) {
          const seqResult: FbSequenceResult = {
            sequence: jsonSeq,
            occurrences: [],
            logs: [],
          }
          const seqChecker = new SeqChecker(jsonSeq, seqResult, DltFilter)
          const allFilters = seqChecker.getAllFilters()
          if (allFilters.length === 0) {
            continue
          }
          // we do want lifecycle infos as well
          allFilters[0].addLifecycles = true
          allFilters[0].maxNrMsgs = maxNrMsgs + 1 // one more to detect whether we ran into the limit
          const allFiltersRq: RQ = {
            path: rq.path,
            commands: [
              {
                cmd: 'query',
                param: JSON.stringify(allFilters),
              },
            ],
          }
          resPromises.push(
            this.performRestQuery(docData, allFiltersRq).then(
              (resJson) => {
                if ('data' in resJson && Array.isArray(resJson.data)) {
                  const lifecycles = new Map(
                    (<any[]>resJson.data)
                      .filter((d: any) => d.type === 'lifecycles')
                      .map((d: any) => [d.id as number, FBANBRestQueryRenderer.getLCInfoFromRQLc(d.attributes)]),
                  )
                  const msgs = <any[]>resJson.data
                    .filter((d: any) => d.type === 'msg')
                    .map((d: any) => {
                      const lifecycle = lifecycles.get(d.attributes.lifecycle)
                      return {
                        index: d.id,
                        ...d.attributes,
                        lifecycle,
                        receptionTimeInMs: lifecycle ? lifecycle.lifecycleStart.valueOf() + d.attributes.timeStamp / 10000 : 0,
                      }
                    })
                  // console.log(`FBAI evaluateSequence ${seqChecker.name} got ${msgs.length} msgs`, resJson)
                  const hitMaxNrMsgsLimit = msgs.length > maxNrMsgs
                  if (hitMaxNrMsgsLimit) {
                    msgs.splice(maxNrMsgs)
                    // TODO add error/warning?
                  }
                  seqChecker.processMsgs(msgs)
                  return seqResult
                }
                return `sequence '${seqChecker.name}' returned no data`
              },
              (failureReason) => {
                const str = `sequence '${seqChecker.name}' evaluation failed with: ${failureReason}`
                console.warn('FBAI evaluateSequence: ' + str)
                return str
              },
            ),
          )
        }
        const r = await Promise.allSettled(resPromises)
        const r2: (string | FbSequenceResult)[] = r.map((setRes) => (setRes.status === 'fulfilled' ? setRes.value : setRes.reason))
        return new SequencesResult(r2)
      } else {
        console.warn(`rq.cmd=${cmd} ignored as no sequences provided!`)
      }
    } catch (e) {
      console.warn(`evaluateSequence got error:${e}`)
    }
  }
}

/**
 *  a class to be able to check for instance of...
 *
 * result is an array for each sequence within the sequences=[] rest query
 * Every entry is either a string representing an error (during exec or no data)
 * Or a FbSequenceResult object with all info from the SeqChecker.
 * */
export class SequencesResult {
  constructor(public result: (string | FbSequenceResult)[]) {}
}
