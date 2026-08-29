import * as vscode from 'vscode'
import { randomUUID } from 'crypto'
import type { Express, Request, Response } from 'express'
import { Server } from 'http'
import path from 'path'
import * as z from 'zod/v4'

import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { CallToolResult, isInitializeRequest, ListResourcesResult, ReadResourceResult } from '@modelcontextprotocol/sdk/types.js'
import { InMemoryEventStore } from '@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js'
import {
  CompleteResourceTemplateCallback,
  ListResourcesCallback,
  McpServer,
  ReadResourceCallback,
  ReadResourceTemplateCallback,
  ResourceMetadata,
  ResourceTemplate,
} from '@modelcontextprotocol/sdk/server/mcp.js'
import { InMemoryTaskMessageQueue, InMemoryTaskStore } from '@modelcontextprotocol/sdk/experimental'
import { Variables } from '@modelcontextprotocol/sdk/shared/uriTemplate.js'

import { FBAEditorProvider } from './fbaEditor'
import { FBAIProvider } from './fbAIProvider'
import { QueryLogsParametersSchema, QueryLogsTool, RootcauseDetailsTool, RootCauseDetailsToolSchema } from './fbAiTools'
import { Fishbone } from './fbaFormat'
import { hashForFishbone } from './fbAiFishboneContext'

interface McpServerData {
  mcpServerDefinition: vscode.McpServerDefinition
  app: Express
  server: Server
  transports: { [sessionId: string]: StreamableHTTPServerTransport }
}

export class FBMcpProvider implements vscode.McpServerDefinitionProvider, vscode.Disposable {
  private disposables: vscode.Disposable[] = []
  private servers: McpServerData[] = [] // todo: or just one server? or just one app?

  constructor(
    private log: vscode.LogOutputChannel,
    private readonly context: vscode.ExtensionContext,
    private editorProvider: FBAEditorProvider,
  ) {
    this.disposables.push(vscode.lm.registerMcpServerDefinitionProvider('fishbone.mcp-servers', this))
    this.log.info('fbMcp: FBMcpProvider registered')

    // create initial servers
    const app = createMcpExpressApp({ host: 'localhost' })
    // define a port and start listening already to block it:
    app.post('/mcp', this.mcpPostHandler.bind(this, app))
    app.get('/mcp', this.mcpGetHandler.bind(this, app))
    app.delete('/mcp', this.mcpDeleteHandler.bind(this, app))

    const server = app.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const addrString = typeof address === 'string' ? address : address ? `${address.address}:${address.port}` : 'unknown'
      const port = typeof address === 'string' ? 0 : address ? address.port : 0
      this.log.info(`fbMcp: MCP Express app started on '${addrString}'`)

      if (port === 0) {
        this.log.error(`fbMcp: MCP Express app has invalid port 0, aborting MCP server creation`)
        server.close()
        server.closeAllConnections()
        return
      }

      this.servers = [
        {
          mcpServerDefinition: new vscode.McpHttpServerDefinition('Fishbone MCP server', vscode.Uri.parse(`http://localhost:${port}/mcp`)),
          app: app,
          server: server,
          transports: {},
        },
      ]
    })
    server.on('error', (error) => {
      this.log.error(`fbMcp: MCP Express app failed to start: ${error.message}`)
    })
  }

  // Create an MCP server with our implementation/features
  private getServer(): McpServer {
    // Create shared task store for demonstration
    const taskStore = new InMemoryTaskStore()
    const server = new McpServer(
      {
        name: 'fishbone-simple-streamable-http-server',
        version: '1.0.0',
        icons: [{ src: './mcp.svg', sizes: ['512x512'], mimeType: 'image/svg+xml' }], // TODO icon...
        websiteUrl: 'https://mbehr1.github.io/fishbone',
      },
      {
        capabilities: { prompts: { listChanged: true }, completions: {}, logging: {}, tasks: { requests: { tools: { call: {} } } } },
        taskStore, // Enable task support
        taskMessageQueue: new InMemoryTaskMessageQueue(),
      },
    )

    // register prompts:
    this.registerPrompts(server)
    // register our resources:
    this.registerResources(server)

    this.registerTools(server)

    this.editorProvider.onDidChangeActiveRestQueryDoc(
      (event) => {
        server.sendLoggingMessage({
          level: 'info',
          data: `Active rest query document changed to: '${event.uri?.toString() || 'none'}'`,
        })
      },
      this,
      this.disposables,
    )

    return server
  }

  // MARK: registerTools
  // Register tools to the MCP server
  private registerTools(server: McpServer) {
    const log = this.log

    const queryTool = new QueryLogsTool(log, this.editorProvider, undefined)
    const cancellationToken = new vscode.CancellationTokenSource().token

    const lmToolResultText = (res: vscode.LanguageModelToolResult): string => {
      const allTexts = res.content.every((part) => part instanceof vscode.LanguageModelTextPart)
      return allTexts ? res.content.map((part) => (part as vscode.LanguageModelTextPart).value).join('\n') : JSON.stringify(res.content)
    }

    server.registerTool(
      'query_logs',
      {
        title: 'Query logs with filters',
        description: 'Query matching dlt-logs with a set of filters. Returns all logs matching the provided filters.',
        inputSchema: QueryLogsParametersSchema,
        // outputSchema: { logs: z.array(z.object()) }, // TODO proper schema for log entries
      },
      async (input): Promise<CallToolResult> => {
        log.info(`fbMcp: Invoking 'query_logs' tool with filters: ${JSON.stringify(input)}`)
        const res = await queryTool.invoke({ input, toolInvocationToken: undefined }, cancellationToken)
        const text = lmToolResultText(res)
        return {
          content: [{ type: 'text', text }],
          // todo provide structuredContent with raw logs array?
        }
      },
    )

    const rootCauseDetailsTool = new RootcauseDetailsTool(log, this.editorProvider, undefined)
    server.registerTool(
      'get_rootcause_details',
      {
        title: 'Get root cause details',
        description: 'Provide details for a root cause in a fishbone.',
        inputSchema: RootCauseDetailsToolSchema,
        // outputSchema: { logs: z.array(z.object()) }, // TODO proper schema for root cause details
      },
      async (input): Promise<CallToolResult> => {
        log.info(`fbMcp: Invoking 'get_rootcause_details' tool with input: ${JSON.stringify(input)}`)
        const res = await rootCauseDetailsTool.invoke({ input, toolInvocationToken: undefined }, cancellationToken)
        const text = lmToolResultText(res)
        return {
          content: [{ type: 'text', text }],
        }
      },
    )
  }

  private getPromptFiles() {
    const log = this.log
    const dirsToScan = this.editorProvider._treeRootNodes.reduce((acc, node) => {
      const fsPath = node._document?.uri.fsPath
      const dir = fsPath ? path.dirname(fsPath) : undefined
      if (dir && !acc.has(dir)) {
        acc.add(dir)
      }
      return acc // <-- this ensures acc is passed along and remains a Set
    }, new Set<string>())
    return FBAIProvider.getPromptFilesFromDirs(log, Array.from(dirsToScan))
  }

  // MARK: registerPrompts
  // Register prompt completions to the MCP server
  private registerPrompts(server: McpServer) {
    const log = this.log

    server.registerPrompt(
      'fishbone-analysis',
      {
        title: 'Fishbone Analysis Prompt',
        description: 'Prompts to support the systematic log analysis with fishbone diagrams.',
        argsSchema: { issue: z.optional(z.string().describe('Description of the issue to analyse')) },
      },
      async ({ issue }) => {
        try {
          const promptFiles = this.getPromptFiles()
          log.info(
            `fbMcp: Found ${promptFiles.length} prompt files (${promptFiles.map((pf) => pf.name).join(', ')}) for fishbone-analysis prompt`,
          )
          server.sendLoggingMessage({
            level: 'debug',
            data: `Found ${promptFiles.length} prompt files (${promptFiles.map((pf) => pf.name).join(', ')}) for fishbone-analysis prompt`,
          })
          // todo: do I need to await sendLoggingMessage?

          const name = issue || 'analyse'
          let prompt = promptFiles.find((pf) => pf.name === name)
          // if issue is empty and no prompt found, return default prompt:
          if (!issue && !prompt) {
            prompt = { name: 'analyse', content: FBAIProvider.getDefaultPrompt('analyse'), data: {} }
          }

          log.info(`fbMcp: Returning fishbone-analysis prompt for issue:${issue}`)
          return {
            messages: prompt ? [{ role: 'user', content: { type: 'text', text: prompt.content } }] : [],
          }
        } catch (e) {
          log.error(`fbMcp: Error generating fishbone-analysis prompt: ${(e as Error).message}`)
          return {
            messages: [],
          }
        }
      },
    )
  }

  // MARK: registerResources
  // Register resources to the MCP server
  private registerResources(server: McpServer) {
    const log = this.log
    const cfg: ResourceMetadata = {}
    const listCb: ListResourcesCallback = (): ListResourcesResult => {
      const treeItems = this.editorProvider._treeRootNodes
      const resources: { uri: string; name: string }[] = []
      try {
        for (const doc of treeItems) {
          if (doc.docData?.lastPostedObj) {
            const fba = doc.docData.lastPostedObj
            if (fba.fishbone.length > 0) {
              resources.push({ uri: `fishbones://${fba.fishbone[0].fbUid || -1}`, name: fba.title })
            }
          }
        }
      } catch (e) {
        log.error(`fbMcp: Error listing resources: ${(e as Error).message}`)
      }
      log.info(`fbMcp: Listing resources: ${resources.map((r) => r.name).join(', ')}`)
      const res: ListResourcesResult = {
        resources,
      }
      return res
    }
    const idCompleteCb: CompleteResourceTemplateCallback = (value: string) => {
      log.info(`fbMcp: Completing resource id for value: '${value}'`)
      const treeItems = this.editorProvider._treeRootNodes
      return treeItems
        .map((doc) => {
          if (doc.docData?.lastPostedObj) {
            const fba = doc.docData.lastPostedObj
            if (fba.fishbone.length > 0) {
              const fbUid = fba.fishbone[0].fbUid
              if (fbUid.startsWith(value)) {
                return fbUid
              }
            }
          }
        })
        .filter((id): id is string => id !== undefined)
    }
    const completeCbs = {
      id: idCompleteCb,
    }
    const template = new ResourceTemplate('fishbones://{id}', { list: listCb, complete: completeCbs })
    const cb: ReadResourceTemplateCallback = async (uri: URL, variables: Variables): Promise<ReadResourceResult> => {
      const treeItems = this.editorProvider._treeRootNodes
      const id = variables['id']
      for (const doc of treeItems) {
        if (doc.docData?.lastPostedObj) {
          const fba = doc.docData.lastPostedObj
          if (fba.fishbone.length > 0 && String(fba.fishbone[0].fbUid) === id) {
            const fbaHash = hashForFishbone(fba)
            log.info(`fbMcp: Reading resource for id ${id}, title: ${fba.title}, fbaHash: ${fbaHash}`)
            return {
              contents: [
                {
                  uri: uri.toString(),
                  mimeType: 'application/json',
                  text: JSON.stringify(this.fbToJson(fba, fbaHash), null, 2), // JSON.stringify(fba, null, 2),
                },
              ],
            }
          }
        }
      }
      return { contents: [] } // TODO or an error?
    }
    const _res_fb = server.registerResource('fishbones', template, cfg, cb)

    // current dlt log resource:
    const listLogsCb: ListResourcesCallback = (): ListResourcesResult => {
      const resources: { uri: string; name: string }[] = this.editorProvider._lastActiveRestQueryDoc.uri
        ? [
            {
              uri: `logs://docs/0`,
              name: vscode.Uri.parse(this.editorProvider._lastActiveRestQueryDoc.uri).path,
            },
          ]
        : []
      const res: ListResourcesResult = {
        resources,
      }
      return res
    }

    const _res_logs = server.registerResource(
      'logs',
      new ResourceTemplate('logs://docs/{docId}', { list: listLogsCb }),
      {},
      async (uri: URL, variables: Variables): Promise<ReadResourceResult> => {
        log.info(`fbMcp: Reading log resource for uri: '${uri.toString()}'`)
        const id = variables['docId']
        if (this.editorProvider._lastActiveRestQueryDoc.uri && typeof id === 'string') {
          const res = await this.queryDocInfo(id)
          return {
            contents: [
              {
                uri: uri.toString(),
                mimeType: 'application/json',
                text: typeof res === 'string' ? res : JSON.stringify(res, null, 2),
              },
            ],
          }
        }
        return { contents: [] }
      },
    )
    this.editorProvider.onDidChangeActiveRestQueryDoc(
      (event) => {
        server.sendResourceListChanged()
      },
      this,
      this.disposables,
    )
  }

  async queryDocInfo(id: string) {
    // try a query to dlt-logs ext:
    const uri = 'ext:mbehr1.dlt-logs' + '/get/docs/' + id + '/ecus'
    return this.editorProvider.performRestQueryUri(uri).then(
      (resJson) => {
        if ('data' in resJson && Array.isArray(resJson.data)) {
          return resJson.data as {
            type: 'ecus'
            id: string
            attributes: {
              name: string
              lifecycles: { type: 'lifecycles'; id: number; attributes: { startTimeUtc: string; endTimeUtc: string; msgs: number } }[]
              sws: string[]
            }
          }[]
        } else {
          return `querying document info returned no data`
        }
      },
      (rejectReason) => {
        return `querying document info failed with reason: ${rejectReason}`
      },
    )
  }

  fbToJson(
    fb: Fishbone,
    fbaHash: number,
  ): {
    type: string
    title: string
    effects: { name: string; categories: { name: string; elements: any[] }[] }[]
  } {
    return {
      type: 'fishbone',
      title: fb.title,
      // attributes: fb.attributes,
      effects: fb.fishbone.map((e) => {
        return {
          // type: 'effect',
          name: e.name,
          categories: e.categories
            .map((c) => {
              return {
                // type: 'category',
                name: c.name,
                elements: c.rootCauses.map((r) => {
                  if (r.type === 'nested' && r.data !== undefined) {
                    const nfb: Fishbone = {
                      title: r.title || '<nested rc wo title>',
                      attributes: fb.attributes,
                      fishbone: r.data,
                    }
                    return this.fbToJson(nfb, fbaHash)
                  } else {
                    return r.fbUid !== undefined
                      ? {
                          type: 'root cause',
                          fbUid: `${fbaHash}_${r.fbUid}`,
                          title: `${r.title || r.props?.label || 'no title'}`,
                        }
                      : undefined
                  }
                }),
              }
            })
            .filter((e) => e !== undefined),
        }
      }),
    }
  }

  // MARK: mcpPostHandler
  // MCP post endpoint
  async mcpPostHandler(app: Express, req: Request, res: Response) {
    const log = this.log
    const serverDef = this.servers.find((s) => s.app === app)
    if (!serverDef) {
      log.error('fbMcp: MCP POST handler: Server definition not found for app', app)
      res.status(500).send('Server definition not found')
      return
    }
    const transports = serverDef.transports
    const sessionId = req.headers['mcp-session-id'] as string | undefined
    try {
      if (sessionId) {
        log.info(`fbMcp: Received MCP Post request for session: ${sessionId}`)
      } else {
        log.info(`fbMcp: Received MCP Post request with body: ${JSON.stringify(req.body)}`)
      }

      let transport: StreamableHTTPServerTransport
      if (sessionId && transports[sessionId]) {
        // Reuse existing transport
        transport = transports[sessionId]
      } else if (!sessionId && isInitializeRequest(req.body)) {
        // New initialization request
        const eventStore = new InMemoryEventStore()
        const log = this.log
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          eventStore, // Enable resumability
          onsessioninitialized: (sessionId) => {
            // Store the transport by session ID when session is initialized
            // This avoids race conditions where requests might come in before the session is stored
            log.info(`Session initialized with ID: ${sessionId}`)
            transports[sessionId] = transport
          },
        })

        // Set up onclose handler to clean up transport when closed
        transport.onclose = () => {
          const sid = transport.sessionId
          if (sid && transports[sid]) {
            log.info(`Transport closed for session ${sid}, removing from transports map`)
            delete transports[sid]
          }
        }

        // Connect the transport to the MCP server BEFORE handling the request
        // so responses can flow back through the same transport
        const server = this.getServer()
        await server.connect(transport)

        await transport.handleRequest(req, res, req.body)
        return // Already handled
      } else {
        // Invalid request - no session ID or not initialization request
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided',
          },
          id: null,
        })
        return
      }

      // Handle the request with existing transport - no need to reconnect
      // The existing transport is already connected to the server
      await transport.handleRequest(req, res, req.body)
    } catch (error) {
      this.log.error('fbMcp: Error handling MCP request:', error)
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        })
      }
    }
  }

  // MARK: mcpGetHandler
  // Handle GET requests for SSE streams (using built-in support from StreamableHTTP)
  async mcpGetHandler(app: Express, req: Request, res: Response) {
    const serverDef = this.servers.find((s) => s.app === app)
    if (!serverDef) {
      this.log.error('fbMcp: MCP GET handler: Server definition not found for app', app)
      res.status(500).send('Server definition not found')
      return
    }
    const transports = serverDef.transports
    const sessionId = req.headers['mcp-session-id'] as string | undefined
    if (!sessionId || !transports[sessionId]) {
      this.log.warn(`fbMcp: MCP GET handler: Invalid or missing session ID: ${sessionId}`)
      res.status(400).send('Invalid or missing session ID')
      return
    }
    // Check for Last-Event-ID header for resumability
    const lastEventId = req.headers['last-event-id'] as string | undefined
    if (lastEventId) {
      this.log.info(`fbMcp: Client reconnecting with Last-Event-ID: ${lastEventId}`)
    } else {
      this.log.info(`fbMcp: Establishing new SSE stream for session ${sessionId}`)
    }
    const transport = transports[sessionId]
    await transport.handleRequest(req, res)
  }

  // MARK: mcpDeleteHandler
  // Handle DELETE requests for session termination (according to MCP spec)
  async mcpDeleteHandler(app: Express, req: Request, res: Response) {
    const serverDef = this.servers.find((s) => s.app === app)
    if (!serverDef) {
      this.log.error('fbMcp: MCP DELETE handler: Server definition not found for app', app)
      res.status(500).send('Server definition not found')
      return
    }
    const sessionId = req.headers['mcp-session-id'] as string | undefined
    if (!sessionId || !serverDef.transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID')
      return
    }

    this.log.info(`fbMcp: Received MCP DELETE session termination request for session ${sessionId}`)
    try {
      const transport = serverDef.transports[sessionId]
      await transport.handleRequest(req, res)
    } catch (error) {
      this.log.error('fbMcp: Error handling session termination:', error)
      if (!res.headersSent) {
        res.status(500).send('Error processing session termination')
      }
    }
  }

  dispose() {
    this.log.info('fbMcp: Disposing FBMcpProvider')
    this.disposables.forEach((d) => d.dispose())
    // close all transports:
    this.servers.forEach((s) => {
      Object.values(s.transports).forEach((t) => {
        t.close()
        this.log.info(`fbMcp: Closed transport for MCP server '${s.mcpServerDefinition.label}'`)
      })
    })
    // also close servers
    this.servers.forEach((s) => {
      s.server.close(() => {
        this.log.info(`fbMcp: Closed MCP server '${s.mcpServerDefinition.label}'`)
      })
    })
  }

  onDidChangeMcpServerDefinitions?: vscode.Event<void> | undefined

  provideMcpServerDefinitions(token: vscode.CancellationToken): vscode.ProviderResult<vscode.McpServerDefinition[]> {
    this.log.info('fbMcp: Providing MCP server definitions from FBMcpProvider')
    return this.servers.map((s) => s.mcpServerDefinition)
  }
  resolveMcpServerDefinition(
    server: vscode.McpServerDefinition,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.McpServerDefinition> {
    this.log.info(`fbMcp: Resolving MCP server definition from FBMcpProvider for server: '${server.label}'`)
    return this.servers.find((s) => s.mcpServerDefinition.label === server.label)?.mcpServerDefinition
  }
}
