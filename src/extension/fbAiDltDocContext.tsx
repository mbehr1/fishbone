import { BasePromptElementProps, PromptElement, PromptPiece, PromptSizing, UserMessage } from '@vscode/prompt-tsx'
import { FBAIProvider } from './fbAIProvider'

export class DltDocContext extends PromptElement<{ provider: FBAIProvider; activeDocUri: string | undefined } & BasePromptElementProps> {
  async render(_state: void, sizing: PromptSizing): Promise<PromptPiece> {
    console.log(`FBAI DltDocContext.render for doc:'${this.props.activeDocUri}`)

    if (this.props.activeDocUri) {
      const docInfo = await this.queryDocInfo()
      console.log(`FBAI DltDocContext.render got docInfo:`, docInfo)

      return (
        <>
          <UserMessage priority={this.props.priority}>The active DLT document has the uri:'{this.props.activeDocUri}'.</UserMessage>
          {typeof docInfo === 'object' /* provide general stats like nr. of messages */ && (
            <UserMessage priority={this.props.priority}>
              The document contains {docInfo.length} {docInfo.length > 1 ? 'ECUs' : 'ECU'} named:
              {docInfo.map((ecu) => `'${ecu.attributes.name}'`).join(', ')}.
            </UserMessage>
          )}
          {
            /* provide contained ECUs with nr of messages */ typeof docInfo === 'object' && (
              <UserMessage priority={this.props.priority}>
                {docInfo
                  .map((ecu) => {
                    return (
                      (ecu.attributes.sws.length > 0
                        ? `The ECU '${ecu.attributes.name}' has SW versions: ${ecu.attributes.sws.join(', ')}.\n`
                        : `The SW versions for ECU '${ecu.attributes.name}' are not identified.\n`) +
                      `It has ${ecu.attributes.lifecycles.length} lifecycles identified:\n` +
                      ecu.attributes.lifecycles
                        .map(
                          (lc) =>
                            `#${lc.id}: ${lc.attributes.startTimeUtc} - ${lc.attributes.endTimeUtc} with ${lc.attributes.msgs} log messages`,
                        )
                        .join(',\n') +
                      '.'
                    )
                  })
                  .join('\n\n')}
              </UserMessage>
            )
          }
          {/* TODO provide apid/ctid info with lower priority */}
        </>
      )
    } else {
      return (
        <UserMessage priority={this.props.priority}>
          `There is no active DLT document. Open one in the editor. Currently only information about open fishbone documents are available.`
        </UserMessage>
      )
    }
  }

  async queryDocInfo() {
    // try a query to dlt-logs ext:
    const uri = 'ext:mbehr1.dlt-logs' + '/get/docs/0/ecus'
    return this.props.provider.performRestQueryUri(uri).then(
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
}
