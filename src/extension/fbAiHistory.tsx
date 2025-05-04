/**
 * copyright (c) 2025, Matthias Behr
 *
 * template copied from https://github.com/microsoft/vscode-prompt-tsx/blob/main/examples/history.tsx, MIT license
 */

import {
  AssistantMessage,
  BasePromptElementProps,
  Chunk,
  PrioritizedList,
  PromptElement,
  PromptMetadata,
  PromptPiece,
  PromptSizing,
  ToolCall,
  ToolMessage,
  ToolResult,
  UserMessage,
} from '@vscode/prompt-tsx'
import {
  CancellationToken,
  CancellationTokenSource,
  ChatContext,
  ChatParticipantToolToken,
  ChatRequestTurn,
  ChatResponseMarkdownPart,
  ChatResponseTurn,
  LanguageModelToolCallPart,
  LanguageModelToolResult,
  LanguageModelToolTokenizationOptions,
  lm,
} from 'vscode'
import { FBAIProvider, IOwnTools, isTsxToolUserMetadata } from './fbAIProvider'
import { DltDocContext } from './fbAiDltDocContext'
import { IFBsToInclude, FishboneContext } from './fbAiFishboneContext'

export interface ToolCallRound {
  response: string
  toolCalls: LanguageModelToolCallPart[]
}

interface IFBAIPromptProps extends BasePromptElementProps {
  history: ChatContext['history'] // or full context
  userQuery: string
  provider: FBAIProvider
  activeDocUri: string | undefined
  ownTools: IOwnTools[]
  fbs: IFBsToInclude[]
  toolInvocationToken: ChatParticipantToolToken // or full request
  toolCallRounds: ToolCallRound[]
  toolCallResults: Record<string, LanguageModelToolResult>
}

/**
 * Including conversation history in your prompt is important as it allows the
 * user to ask followup questions to previous messages. However, you want to
 * make sure its priority is treated appropriately because history can
 * grow very large over time.
 *
 * We've found that the pattern which makes the most sense is usually to prioritize, in order:
 *
 * 1. The base prompt instructions, then
 * 1. The current user query, then
 * 1. The last couple turns of chat history, then
 * 1. Any supporting data, then
 * 1. As much of the remaining history as you can fit.
 *
 * For this reason, we split the history in two parts in the prompt, where
 * recent prompt turns are prioritized above general contextual information.
 */
export class FBAIPrompt extends PromptElement<IFBAIPromptProps> {
  render() {
    const r = (
      <>
        <UserMessage priority={100}>
          Your task is to analyse logs systematically via the help of fishbone files. The logs are typically in the form of dlt log files.
          The fishbones to be used are part of opened fishbone fba files. You should start by trying to understand the problem description
          first. Then you can use the fishbone files to help you understand the logs and systematically exclude possible causes or identify
          possible root causes. Each fishbone can provide info on how to analyse multiple problems called 'effects'. Each effect can contain
          various categories that cluster a set of possible root causes. Each fishbone root cause can contain additional information like
          background and instructions and 'apply filter' filter details to query logs related to that root cause. Additionally a fishbone
          root cause can contain an upper and a lower badge that are the results of filtering the logs and appyling some checks on the
          returned messages. The upper badge usually indicates whether that potential root cause should be more carefully considered. The
          lower badge usually extracts some data from the logs that can help in understanding root cause related aspects of the logs. The
          filter details returned for 'apply filter' can be provided to the queryLogs tool as filters. Take care to provide exactly the
          filters returned. To analyse a problem systematically do the following steps: 1. try to understand the problem description. It
          should match any of the effects covered by the fishbone. If not ask the user which effect would match to the problem description.
          2. evaluate all the potential root causes of the effect and its categories. Evaluate means that you should check the details for
          the root cause i.e. consider the background info for each root cause and follow the instructions if the root cause might be
          relevant. Use the info from the badges from each root cause as well. 3. List all potential root causes to the user that you think
          are relevant for the problem description. If no root cause could be identified, give that info to the user and ask him to extend
          the fishbone with the missing potential root causes. 4. Once you're done always provide the user with a short summary including: -
          the identified problem description - the effects that matches the problem description - the root causes that you checked - the
          root causes that you think are potentially relevant if any.
        </UserMessage>
        <DltDocContext priority={90} provider={this.props.provider} activeDocUri={this.props.activeDocUri} />
        <FishboneContext priority={80} flexGrow={1} fbs={this.props.fbs} />
        <History
          ownTools={this.props.ownTools}
          history={this.props.history}
          passPriority
          older={0}
          newer={80}
          flexGrow={2}
          flexReserve='/5'
        />
        {/* todo later ad references <PromptReferences
					references={this.props.request.references}
					priority={20}
				/>*/}
        {/* The user query is right behind the system message in priority */}
        <UserMessage priority={90}>{this.props.userQuery}</UserMessage>
        {/*<UserMessage priority={60}>
          TODO: use it for e.g. lifecycle infos of the loaded dlt file.
          Or the last used search terms.
					With a slightly lower priority, you can include some contextual data about the workspace
					or files here...
				</UserMessage>*/}
        <ToolCalls
          ownTools={this.props.ownTools}
          fbs={this.props.fbs}
          toolCallRounds={this.props.toolCallRounds}
          toolInvocationToken={this.props.toolInvocationToken}
          toolCallResults={this.props.toolCallResults}
        />
      </>
    )
    //console.warn(`FBAIPrompt.render()...r=${JSON.stringify(r)}`)
    return r
  }
}

interface IHistoryProps extends BasePromptElementProps {
  history: ChatContext['history']
  ownTools: IOwnTools[]
  newer: number // last 2 message priority values
  older: number // previous message priority values
  passPriority: true // require this prop be set!
}

/**
 * We can wrap up this history element to be a little easier to use. `prompt-tsx`
 * has a `passPriority` attribute which allows an element to act as a 'pass-through'
 * container, so that its children are pruned as if they were direct children of
 * the parent. With this component, the elements
 *
 * ```
 * <HistoryMessages history={this.props.history.slice(0, -2)} priority={0} />
 * <HistoryMessages history={this.props.history.slice(-2)} priority={80} />
 * ```
 *
 * ...can equivalently be expressed as:
 *
 * ```
 * <History history={this.props.history} passPriority older={0} recentPriority={80} />
 * ```
 */
export class History extends PromptElement<IHistoryProps> {
  render(): PromptPiece {
    return (
      <>
        <HistoryMessages ownTools={this.props.ownTools} history={this.props.history.slice(0, -2)} priority={this.props.older} />
        <HistoryMessages ownTools={this.props.ownTools} history={this.props.history.slice(-2)} priority={this.props.newer} />
      </>
    )
  }
}

interface IHistoryMessagesProps extends BasePromptElementProps {
  history: ChatContext['history']
  ownTools: IOwnTools[]
}

/**
 * The History element simply lists user and assistant messages from the chat
 * context. If things like tool calls or file trees are relevant for, your
 * case, you can make this element more complex to handle those cases.
 */
export class HistoryMessages extends PromptElement<IHistoryMessagesProps> {
  render(): PromptPiece {
    const history: (UserMessage | AssistantMessage)[] = []
    for (const turn of this.props.history) {
      if (turn instanceof ChatRequestTurn) {
        history.push(<UserMessage>{turn.prompt}</UserMessage>)
      } else if (turn instanceof ChatResponseTurn) {
        const metadata = turn.result.metadata
        // console.log('FBAI HistoryMessage metadata:', metadata)
        if (isTsxToolUserMetadata(metadata) && metadata.toolCallsMetadata.toolCallRounds.length > 0) {
          // console.log('FBAI HistoryMessage ToolCalls found in history:', metadata.toolCallsMetadata)
          history.push(
            <ToolCalls
              ownTools={this.props.ownTools}
              fbs={[]}
              toolCallResults={metadata.toolCallsMetadata.toolCallResults}
              toolCallRounds={metadata.toolCallsMetadata.toolCallRounds}
              toolInvocationToken={undefined}
            />,
          )
        } else {
          history.push(<AssistantMessage name={turn.participant}>{chatResponseToMarkdown(turn)}</AssistantMessage>)
        }
      }
    }
    return (
      <PrioritizedList priority={0} descending={false}>
        {history}
      </PrioritizedList>
    )
  }
}

const chatResponseToMarkdown = (response: ChatResponseTurn) => {
  let str = ''
  for (const part of response.response) {
    if (response instanceof ChatResponseMarkdownPart) {
      str += part.value
    }
  }

  return str
}

// #region ToolCalls
interface ToolCallsProps extends BasePromptElementProps {
  ownTools: IOwnTools[]
  fbs: IFBsToInclude[]
  toolCallRounds: ToolCallRound[]
  toolCallResults: Record<string, LanguageModelToolResult>
  toolInvocationToken: ChatParticipantToolToken | undefined
}

const dummyCancellationToken: CancellationToken = new CancellationTokenSource().token

/**
 * Render a set of tool calls, which look like an AssistantMessage with a set of tool calls followed by the associated UserMessages containing results.
 */
class ToolCalls extends PromptElement<ToolCallsProps, void> {
  async render(_state: void, _sizing: PromptSizing) {
    if (!this.props.toolCallRounds.length) {
      return undefined
    }

    // Note- for the copilot models, the final prompt must end with a non-tool-result UserMessage
    return (
      <>
        {this.props.toolCallRounds.map((round) => this.renderOneToolCallRound(round))}
        <UserMessage>
          Above is the result of calling one or more tools. The user cannot see the results, so you should explain them to the user if
          referencing them in your answer.
        </UserMessage>
      </>
    )
  }

  private renderOneToolCallRound(round: ToolCallRound) {
    const assistantToolCalls: ToolCall[] = round.toolCalls.map((tc) => ({
      type: 'function',
      function: { name: tc.name, arguments: JSON.stringify(tc.input) },
      id: tc.callId,
    }))
    return (
      <Chunk>
        <AssistantMessage toolCalls={assistantToolCalls}>{round.response}</AssistantMessage>
        {round.toolCalls.map((toolCall) => (
          <ToolResultElement
            ownTools={this.props.ownTools}
            toolCall={toolCall}
            toolInvocationToken={this.props.toolInvocationToken}
            toolCallResult={this.props.toolCallResults[toolCall.callId]}
          />
        ))}
      </Chunk>
    )
  }
}

interface ToolResultElementProps extends BasePromptElementProps {
  ownTools: IOwnTools[]
  toolCall: LanguageModelToolCallPart
  toolInvocationToken: ChatParticipantToolToken | undefined
  toolCallResult: LanguageModelToolResult | undefined
}

/**
 * One tool call result, which either comes from the cache or from invoking the tool.
 */
class ToolResultElement extends PromptElement<ToolResultElementProps, void> {
  async render(state: void, sizing: PromptSizing): Promise<PromptPiece | undefined> {
    const tool = lm.tools.find((t) => t.name === this.props.toolCall.name)

    if (!tool && !this.props.ownTools.find((t) => t.info.name === this.props.toolCall.name)) {
      console.error(`Tool not found: ${this.props.toolCall.name}`)
      return <ToolMessage toolCallId={this.props.toolCall.callId}>Tool not found</ToolMessage>
    }

    const tokenizationOptions: LanguageModelToolTokenizationOptions = {
      tokenBudget: sizing.tokenBudget,
      countTokens: async (content: string) => sizing.countTokens(content),
    }

    //console.log(`FBAI ToolResult ${this.props.toolCallResult ? 'using from cache' : 'invoking tool'}`)

    const ownToolCall = async (toolName: string): Promise<LanguageModelToolResult> => {
      console.log(`FBAI ToolResult ownToolCall for toolName: ${toolName}`)
      const r = await this.props.ownTools
        .find((t) => t.info.name === this.props.toolCall.name)!
        .tool.invoke(
          { input: this.props.toolCall.input, toolInvocationToken: this.props.toolInvocationToken, tokenizationOptions },
          dummyCancellationToken,
        )
      if (r) {
        return r
      } else {
        return new LanguageModelToolResult([])
      }
    }

    const toolResult: LanguageModelToolResult =
      this.props.toolCallResult ??
      (tool
        ? await lm.invokeTool(
            this.props.toolCall.name,
            { input: this.props.toolCall.input, toolInvocationToken: this.props.toolInvocationToken, tokenizationOptions },
            dummyCancellationToken,
          )
        : await ownToolCall(this.props.toolCall.name))
    //console.log(`FBAI ToolResult toolResult:`, toolResult)

    return (
      <ToolMessage toolCallId={this.props.toolCall.callId}>
        <meta value={new ToolResultMetadata(this.props.toolCall.callId, toolResult)}></meta>
        <ToolResult data={toolResult} />
      </ToolMessage>
    )
  }
}

export class ToolResultMetadata extends PromptMetadata {
  constructor(
    public toolCallId: string,
    public result: LanguageModelToolResult,
  ) {
    //console.log('FBAI ToolResultMetadata created with toolCallId:', toolCallId, result)
    super()
  }
}
