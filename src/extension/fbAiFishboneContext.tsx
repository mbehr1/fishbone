import * as vscode from 'vscode'
import { BasePromptElementProps, PromptElement, PromptPiece, PromptSizing, UserMessage } from '@vscode/prompt-tsx'

import { Fishbone } from './fbaFormat'
import { safeStableStringify } from './util'

export interface IFBsToInclude {
  uri: vscode.Uri | undefined
  fb: Fishbone
  // line: number
}

export function hashForFishbone(fb: Fishbone): number {
  return cyrb53(safeStableStringify(fb)) // TODO could remove backups here
}

export class FishboneContext extends PromptElement<{ fbs: IFBsToInclude[]; fbaHash?: number } & BasePromptElementProps> {
  renderFishbone(fb: IFBsToInclude): PromptPiece {
    const fba = fb.fb
    const uri = fb.uri
    const fbaHash = this.props.fbaHash || hashForFishbone(fba) // we keep the hash for the fishbne as it needs to be the outer one for nested fishbones

    return (
      <>
        <UserMessage priority={70}>Fishbone title: '{fba.title}'</UserMessage>
        <UserMessage priority={70}>
          This fishbone contains details for the following effects:
          {fba.fishbone.map((e) => (
            <UserMessage priority={70}>
              <br />
              {`effect: '${e.name}' with the following categories:`}
              {e.categories.map((c) => (
                <UserMessage priority={70}>
                  <br />
                  {`category:'${c.name}' with the following potential root causes:`}
                  {c.rootCauses.map((r) => {
                    if (r.type === 'nested' && r.data !== undefined) {
                      const fb: Fishbone = {
                        title: r.title || '<nested rc wo title>',
                        attributes: fba.attributes,
                        fishbone: r.data,
                      }
                      return <FishboneContext fbs={[{ fb, uri }]} fbaHash={fbaHash} /> // todo or here just a info that the nested fishbone with name is included and add the nested ones after this one?
                    } else {
                      return (
                        <UserMessage priority={70}>
                          <br />
                          {`root cause (fbUid:'${fbaHash}_${r.fbUid}'): '${r.title || r.props?.label || 'no title'}`}
                        </UserMessage>
                      )
                    }
                  })}
                </UserMessage>
              ))}
            </UserMessage>
          ))}
        </UserMessage>
      </>
    )
  }

  async render(_state: void, sizing: PromptSizing): Promise<PromptPiece> {
    // todo consider sizing.tokenBudget using sizing.countTokens(...)
    return <>{this.props.fbs.map((f) => this.renderFishbone(f))}</>
  }
}


// cyrb53 (c) 2018 bryc (github.com/bryc). License: Public domain. Attribution appreciated.
// A fast and simple 64-bit (or 53-bit) string hash function with decent collision resistance.
// Largely inspired by MurmurHash2/3, but with a focus on speed/simplicity.
// See https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript/52171480#52171480
// https://github.com/bryc/code/blob/master/jshash/experimental/cyrb53.js
const cyrb53 = (str: string, seed = 0) => {
  let h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  // For a single 53-bit numeric return value we could return
  // 4294967296 * (2097151 & h2) + (h1 >>> 0);
  // but we instead return the full 64-bit value: (we dont. modified)
  return 4294967296 * (2097151 & h2) + (h1 >>> 0) // .toString(); // [h2>>>0, h1>>>0];
}
