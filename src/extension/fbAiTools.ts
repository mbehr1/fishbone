import * as vscode from 'vscode'
import * as JSON5 from 'json5'
import { z } from 'zod'
import { FBAIProvider, SequencesResult } from './fbAIProvider'
import { DocData } from './fbaEditor'
import { DltFilter, escapeForMD, FbSequenceResult, lastEventForOccurrence, seqResultToMdAst } from 'dlt-logs-utils/sequence'
import { toMarkdown } from 'mdast-util-to-markdown'
import { gfmTableToMarkdown } from 'mdast-util-gfm-table'
import { RQ, rqUriDecode, rqUriEncode } from 'dlt-logs-utils/restQuery'
import { hashForFishbone } from './fbAiFishboneContext'
import { FBBadge } from './fbaFormat'
import { safeStableStringify } from './util'

const RootCauseDetailsToolSchema = z.object({
  fbUid: z
    .string()
    .describe(
      'The uid of the root cause to provide details for. It needs to be exactly the fbUid without any additional characters pre- or appended.',
    ),
})
type IRootcauseDetailsParameters = z.infer<typeof RootCauseDetailsToolSchema>

// #region RootcauseDetails
export class RootcauseDetailsTool implements vscode.LanguageModelTool<IRootcauseDetailsParameters> {
  constructor(
    private log: vscode.LogOutputChannel,
    private provider: FBAIProvider,
    toolInfo: vscode.LanguageModelToolInformation | undefined,
  ) {
    // verify the inputSchema
    if (toolInfo?.inputSchema) {
      // Perform schema validation here
      try {
        const expectedSchema = z.toJSONSchema(RootCauseDetailsToolSchema)
        const expectedAsString = safeStableStringify(expectedSchema)
        const currentAsString = safeStableStringify({
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          additionalProperties: false, // TODO weird, not accepted in package.json
          ...toolInfo.inputSchema,
        })
        if (currentAsString !== expectedAsString) {
          this.log.warn(
            `Input schema does not match expected schema for RootcauseDetailsTool: expected:\n${expectedAsString}\nreceived:\n${currentAsString}`,
          )
        }
      } catch (error) {
        this.log.error('Invalid input schema for RootcauseDetailsTool:', error)
        //throw new Error('Invalid input schema for RootcauseDetailsTool')
      }
    }
  }

  getFilterFragsFor(rqString: string) {
    try {
      const rq = rqUriDecode(rqString)
      const fragsToRet = []
      const mapFrag = (f: any) => {
        const newF = {
          ...f,
          tmpFb: undefined,
        }
        return newF
      }
      for (const cmd of rq.commands) {
        switch (cmd.cmd) {
          case 'query':
          case 'add':
            {
              // this.log.info(`FBAI getFilterFragsFor got command:${cmd.cmd} with param:`, cmd.param)
              const filterFrags = JSON5.parse(cmd.param)
              if (filterFrags !== undefined) {
                if (Array.isArray(filterFrags) && filterFrags.length > 0) {
                  fragsToRet.push(...filterFrags.map(mapFrag))
                } else if (typeof filterFrags === 'object' && filterFrags !== null) {
                  fragsToRet.push(mapFrag(filterFrags))
                } else {
                  this.log.warn(`FBAI getFilterFragsFor got invalid filter fragment: ${JSON.stringify(filterFrags)}`)
                }
              }
            }
            break
          case 'sequences':
          case 'report': // TODO from here we could use the filter frags as well! (or special support for conversionFn?)
          case 'delete':
          case 'patch':
          case 'enableAll':
          case 'disableAll':
            break
          default:
            this.log.warn(`FBAI getFilterFragsFor ignored command:${cmd.cmd}`)
        }
      }
      return fragsToRet
    } catch (e) {
      this.log.error(`FBAI getFilterFragsFor got error:${e}`)
      return undefined
    }
  }

  async processBadge(docData: DocData, badge: FBBadge) {
    const log = this.log
    try {
      const r = this.provider.evaluateRestQuery(docData, badge)
      if (r !== undefined) {
        const res = await r
        if (res !== undefined) {
          log.info('FBAI processBadge got result:', res)
          if (res instanceof SequencesResult) {
            if (res.result.length === 0) {
              return undefined
            }
            let toRet = ''
            for (const seq of res.result) {
              if (typeof seq === 'string') {
                toRet += `${seq}\n`
              } else {
                // a proper seq occurrence
                if (seq.occurrences.length > 0) {
                  // add a summary for each occurrence and details for the non ok ones:
                  toRet += '```'
                  toRet += `For sequence '${seq.sequence.name}' ${seq.occurrences.length} ${
                    seq.occurrences.length > 1 ? 'occurrence has' : 'occurrences have'
                  } been found:\n\n`
                  // TODO compare number of tokens for html table and accurracy on understanding
                  // (or yaml table or csv/tab separated values)
                  // output as markdown table with occ #, occ status, context and kpis
                  toRet += '| # | result | time | context | KPIs |\n'
                  toRet += '|-|-|-|-|-|\n'
                  for (const occ of seq.occurrences) {
                    const status = occ.result
                    const startEvent = occ.startEvent
                    const lastEvent = lastEventForOccurrence(occ)
                    const timeStr =
                      lastEvent.timeInMs && startEvent.timeInMs && lastEvent.timeInMs !== startEvent.timeInMs
                        ? `${new Date(startEvent.timeInMs).toLocaleString('de-DE')} - ${new Date(lastEvent.timeInMs).toLocaleString(
                            'de-DE',
                          )}`
                        : startEvent.timeInMs
                          ? new Date(startEvent.timeInMs).toLocaleString('de-DE')
                          : startEvent.timeStamp
                    const context = escapeForMD(occ.context.map(([key, value]) => `${key}: ${value}`).join(', '))
                    const kpis = escapeForMD(occ.kpis.map((k) => `${k.name}: ${k.values.join(', ')}`).join(', '))
                    toRet += `| ${occ.instance} | ${status} | ${timeStr} | ${context} | ${kpis} |\n`
                  }
                  // add details for each non-ok ones:
                  const failedOccs = seq.occurrences.filter((occ) => occ.result !== 'ok')
                  if (failedOccs.length > 0) {
                    toRet += `\n\nDetails for the non-ok occurrences:\n`
                    const failedSeqRes: FbSequenceResult = {
                      ...seq,
                      occurrences: failedOccs,
                      logs: [], // we dont want logs from seq. processing here
                    }
                    const resAsMd = seqResultToMdAst(failedSeqRes)
                    const resAsMarkdown = toMarkdown(
                      { type: 'root', children: resAsMd },
                      { extensions: [gfmTableToMarkdown({ tablePipeAlign: false })] },
                    )
                    toRet += resAsMarkdown
                    toRet += '\n\n'
                  }
                  toRet += '```'
                } else {
                  toRet += `For sequence '${seq.sequence.name}' no occurrences have been found.`
                }
              }
            }
            return toRet
          } else {
            switch (typeof res) {
              case 'bigint':
              case 'number':
              case 'boolean':
              case 'string':
                return res.toString()
              case 'object':
                return JSON.stringify(res)
              default:
                return undefined
            }
          }
        } else {
          log.warn(`FBAI processBadge got no result for badge: ${JSON.stringify(badge)}`)
          return undefined
        }
      }
    } catch (e) {
      log.warn(`FBAI processBadge got error:${e}`)
      return undefined
    }
  }

  async invoke(options: vscode.LanguageModelToolInvocationOptions<IRootcauseDetailsParameters>, _token: vscode.CancellationToken) {
    const log = this.log
    const params = options.input
    log.info('FBAIProvider RCDT invoked with params:', params)
    if (typeof params.fbUid === 'string') {
      // we expect a fbUid like 'fbaHash_rcUid' or 'rcUid'
      const splitted = params.fbUid.split('_') // '_' should never be part of a fbUid (short-unique-id uses alphanum only)
      const fbaHash = splitted.length > 1 ? Number(params.fbUid.split('_')[0]) : undefined
      const rcUid = splitted.length > 1 ? params.fbUid.split('_')[1] : params.fbUid
      // if fbaHash is defined we check if it is the same as the one in the fishbone
      // if fbaHash is not defined we use the first matching one
      // this is to handle the case where the user has multiple fishbones with the same root cause (e.g. copied once...)

      const fbs = this.provider.getFishbones() // TODO make it a parameter...
      let rc = undefined
      let docData = undefined

      for (const fb of fbs) {
        if (fbaHash !== undefined && fb.lastPostedObj !== undefined && hashForFishbone(fb.lastPostedObj) !== fbaHash) {
          continue
        }
        rc = this.provider.getRootCause(fb.lastPostedObj!, rcUid)
        if (rc !== undefined) {
          docData = fb
          break
        }
      }
      if (rc !== undefined) {
        const textOfStringOrMD = (value: string | { textValue: string }) => {
          return typeof value === 'string' ? value : value.textValue
        }

        log.info('FBAIProvider RCDT found rc:', rc)

        // check for rc.props.badge and rc.props.badge2
        // and rc.props.filter
        const upperBadge = docData && rc.props?.badge ? await this.processBadge(docData, rc.props.badge) : undefined
        const lowerBadge = docData && rc.props?.badge2 ? await this.processBadge(docData, rc.props.badge2) : undefined
        const filterFrags =
          rc.props?.filter?.source && typeof rc.props.filter.source === 'string'
            ? this.getFilterFragsFor(rc.props.filter.source)
            : undefined
        log.info(`FBAI RCDT upperBadge=${upperBadge}`)
        log.info(`FBAI RCDT lowerBadge=${lowerBadge}`)
        // log.info(`FBAI RCDT filterFrags=${JSON.stringify(filterFrags, undefined, 2)}`)
        if (filterFrags !== undefined && docData !== undefined) {
          // need to substitute attributes here as the root cause results are specific for a set of attributes
          this.provider.substFilterAttributes(docData, filterFrags)
          // log.info(`FBAI RCDT subst filterFrags=${JSON.stringify(filterFrags, undefined, 2)}`)
        }

        return new vscode.LanguageModelToolResult(
          [
            new vscode.LanguageModelTextPart(`The root cause with fbUid:'${options.input.fbUid}':`),
            new vscode.LanguageModelTextPart(`name:'${rc.title || rc.props?.label}'`),
            rc.props?.backgroundDescription !== undefined
              ? new vscode.LanguageModelTextPart(`background:'${textOfStringOrMD(rc.props.backgroundDescription)}'`)
              : undefined,
            rc.props?.instructions !== undefined
              ? new vscode.LanguageModelTextPart(`instructions:'${textOfStringOrMD(rc.props.instructions)}'`)
              : undefined,
            upperBadge !== undefined ? new vscode.LanguageModelTextPart(`upper badge:'${upperBadge}'\n`) : undefined,
            lowerBadge !== undefined ? new vscode.LanguageModelTextPart(`lower badge:'${lowerBadge}'\n`) : undefined,
            filterFrags !== undefined && filterFrags.length > 0
              ? new vscode.LanguageModelTextPart(`filters from 'apply filter'` + '```json\n' + JSON.stringify(filterFrags) + '```\n')
              : undefined,
          ].filter((part) => part !== undefined),
        )
      } else {
        log.warn(`FBAIProvider RCDT found no rc with that fbUid:'${options.input.fbUid}'`)
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart('Invalid parameter. fbUid not for a known root cause.'),
        ])
      }
    } else {
      return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart('Invalid parameter. fbUid not a string')])
    }
  }

  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<IRootcauseDetailsParameters>,
    _token: vscode.CancellationToken,
  ) {
    const confirmationMessages = {
      title: 'Providing details for a fishbone root cause',
      message: new vscode.MarkdownString(`Provide details for fishbone root cause (${options.input.fbUid})?`),
    }

    return {
      invocationMessage: `Providing details for fishbone root cause (${options.input.fbUid})`,
      // not needed here, tool usage is non costly and shares no data. confirmationMessages,
    }
  }
}

// #region QueryLogs

const QueryLogsParametersSchema = z.object({
  filters: z
    .array(
      z.object({
        type: z.number().describe('The type of the filter (0 = pos, 1 = negative).'),
        ecu: z.string().optional().describe('Optional ecu to filter for.'),
        apid: z.string().optional().describe('Optional apid (application id) to filter for.'),
        ctid: z.string().optional().describe('Optional ctid (context id) to filter for.'),
        payloadRegex: z.string().optional().describe('Optional regular expression to filter the payload of the log for.'),
        ignoreCasePayload: z
          .boolean()
          .optional()
          .describe('Optional flag to ignore case for the payload regex. If not set any payload search is case sensitive.'),
        logLevelMin: z
          .number()
          .min(1)
          .max(6)
          .optional()
          .describe(
            'Optional minimum log level to filter for. The following log-levels are defined: FATAL=1, ERROR=2, WARNING=3, INFO=4, DEBUG=5, VERBOSE=6.',
          ),
        logLevelMax: z
          .number()
          .min(1)
          .max(6)
          .optional()
          .describe(
            'Optional maximum log level to filter for. E.g. to add all messages with warnings, error or fatal messages use a positive filter with logLevelMax = 3.',
          ),
      }),
    )
    .min(1)
    .describe(
      'List of filters to apply. If no positive filter is provided all logs are shown that are not filtered out by negative filters. If any positive filter is provided only logs passing: any (or) of the positive filters and are not filtered out by any of the negative filters.',
    ),
})
type IQueryLogsParameters = z.infer<typeof QueryLogsParametersSchema>

// Decision: no attributes support here. Needs to be substituted upfront.
// add fbUid from rootcause to identify the fishbone.attributes to use?

export class QueryLogsTool implements vscode.LanguageModelTool<IQueryLogsParameters> {
  constructor(
    private log: vscode.LogOutputChannel,
    private provider: FBAIProvider,
    toolInfo: vscode.LanguageModelToolInformation | undefined,
  ) {
    // verify the inputSchema
    if (toolInfo?.inputSchema) {
      // Perform schema validation here
      try {
        const expectedSchema = z.toJSONSchema(QueryLogsParametersSchema)
        const expectedAsString = safeStableStringify(expectedSchema)
        const currentAsString = safeStableStringify({
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          additionalProperties: false, // TODO weird, not accepted in package.json
          ...toolInfo.inputSchema,
        })
        if (currentAsString !== expectedAsString) {
          this.log.warn(
            `Input schema does not match expected schema for QueryLogsTool: expected:\n${expectedAsString}\nreceived:\n${currentAsString}`,
          )
        }
      } catch (error) {
        this.log.error('Invalid input schema for QueryLogsTool:', error)
        //throw new Error('Invalid input schema for QueryLogsTool')
      }
    }
  }

  async processFilters(filters: DltFilter[]) {
    try {
      const filterFrags = filters.map((f) => f.asConfiguration())
      if (filterFrags.length > 0) {
        // we want lifecycles as well:
        filterFrags[0].addLifecycles = true
        // if we ever want to get more than 1000 msgs:
        // filterFrags[0].maxNrMsgs = 1000
      }
      const rq: RQ = {
        path: 'ext:mbehr1.dlt-logs/get/docs/0/filters',
        commands: [
          {
            cmd: 'query',
            param: JSON.stringify(filterFrags),
          },
        ],
      }
      const r = await this.provider.performRestQueryUri(rqUriEncode(rq)).then(
        (resJson) => {
          if (resJson.data && Array.isArray(resJson.data)) {
            const lcsMap: Map<number, any> = new Map(
              resJson.data.filter((d: any) => d.type === 'lifecycles').map((l: any) => [l.id, l.attributes]),
            )

            // return the calculated time for the messages
            // as lc start time + monotonic time stamp
            const calcTime = (lcId: number, timeStamp_dms: number) => {
              const lc = lcsMap.get(lcId)
              if (lc !== undefined) {
                let startTime_ms = Date.parse(lc.startTimeUtc)
                let calcTime = startTime_ms + timeStamp_dms / 10
                return new Date(calcTime) // or as de-de locale string? TODO think about time zone support.
              } else {
                return undefined
              }
            }

            const msgs: any[] = resJson.data
              .filter((d: any) => d.type === 'msg')
              .map((d: any) => {
                return {
                  idx: d.id,
                  calcTime: calcTime(d.attributes.lifecycle, d.attributes.timeStamp),
                  ...d.attributes,
                  timeStamp: d.attributes.timeStamp / 10000, // convert to secs
                } // TODO add recordedTimeMs (from dlt-logs)
              })
            // TODO add info on the columns here (or at the tools definition?)
            return `query for filters returned ${msgs.length} logs:\n` + '```\n' + JSON.stringify(msgs) + '\n```\n'
          } else {
            return `query for filters returned no data: '${JSON.stringify(resJson)}'`
          }
        },
        (rejectReason) => {
          return `query for filters failed with: '${rejectReason}'`
        },
      )
      return r
    } catch (e) {
      return `query for filters failed with exception: '${e}'`
    }
  }
  async invoke(options: vscode.LanguageModelToolInvocationOptions<IQueryLogsParameters>, _token: vscode.CancellationToken) {
    const log = this.log
    const params = options.input
    log.info('FBAIProvider QLT invoked with params:', params)

    if (Array.isArray(params.filters) && params.filters.length > 0) {
      try {
        const filters = params.filters.map((frag) => new DltFilter(frag))
        const res = await this.processFilters(filters)
        log.info(`FBAIProvider QLT got res:${JSON.stringify(res, undefined, 2)}`)
        if (typeof res === 'string') {
          return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(res)])
        }
        return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`No logs are matching the ${params.filters} filters.`)])
      } catch (e) {
        return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`Invalid parameter. Parsing filters got error:${e}`)])
      }
    } else {
      return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart('Invalid parameter. filters not an array')])
    }
  }

  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<IQueryLogsParameters>,
    _token: vscode.CancellationToken,
  ) {
    const confirmationMessages = {
      title: 'Provide logs matching a set of filters',
      message: new vscode.MarkdownString(`Provide logs matching ${options.input.filters.length} filters?`),
    }

    return {
      invocationMessage: `Provide logs matching ${options.input.filters.length} filters?`,
      // not needed here, tool usage is non costly and shares no data. confirmationMessages,
    }
  }
}
