import * as yaml from 'js-yaml'
import ShortUniqueId from 'short-unique-id'
import * as zlib from 'zlib'

export const currentFBAFileVersion = '0.7'

/**
 * types for the persisted fishbone
 */

export interface Fishbone {
  type?: 'fba'
  version?: string // 0.7
  title: string
  attributes: FBAttribute[]
  fishbone: FBEffect[]
  backups?: FBBackup[]
}

export interface FBBackup {
  date: Date
  reason: string
  textDeflated: string
}

export interface FBAttribute {
  fbUid: string
  [name: string]:
    | {
        label: string
        type?: string
        value?: any
        dataProvider?: {
          jsonPath: string
          source: string
        }
      }
    | string // for fbUid only
}
export interface FBEffect {
  fbUid: string
  categories: FBCategory[]
}

export interface FBACheckboxProps {
  label: string
  value?: any
  instructions?: string | { markdownFormat: boolean; textValue: string }
  backgroundDescription?: string | { markdownFormat: boolean; textValue: string }
  filter?: any // todo
  badge?: FBBadge
  badge2?: FBBadge
}

export interface FBRootCause {
  fbUid: string
  type: string
  element?: string
  props?: FBACheckboxProps
  relPath?: string
  title?: string
  data?: FBEffect[]
}

export interface FBCategory {
  fbUid: string
  rootCauses: FBRootCause[]
}

export interface FBBadge {
  source: string // restQuery
  jsonPath?: string
  conv?: string // length | index:idx | func: fn(result)...
}

const uid = new ShortUniqueId.default({ length: 8 })

export function getFBDataFromText(text: string): Fishbone {
  // here we do return the data that we pass as data=... to the Fishbone

  // our document is a yaml document.
  // representing a single object with properties:
  //  type <- expect "fba"
  //  version <- 0.4 (currentFBAFileVersion)
  //  title
  //  fishbone : array of effect objects
  //  attributes

  let yamlObj: any = undefined
  if (text.trim().length === 0) {
    yamlObj = {
      type: 'fba',
      version: currentFBAFileVersion,
      title: '<no title>',
      fishbone: [
        {
          fbUid: uid.randomUUID(),
          name: '<enter effect to analyse>',
          categories: [
            {
              fbUid: uid.randomUUID(),
              name: 'category 1',
              rootCauses: [],
            },
          ],
        },
      ],
      attributes: [],
    }
  } else {
    yamlObj = yaml.load(text, { schema: yaml.JSON_SCHEMA })
  }
  if (typeof yamlObj !== 'object') {
    throw new Error(`content is no 'object' but '${typeof yamlObj}'`)
  }
  console.log(`getFBDataFromText(len=${text.length}) type=${yamlObj.type}, version=${yamlObj.version}, title=${yamlObj.title}`)

  // convert data from prev. versions?
  const convertv01Effects = (effects: any) => {
    return effects.map((effectsPair: any) => {
      return {
        name: effectsPair[0],
        categories: effectsPair[1].map((catPair: any) => {
          return {
            name: catPair[0],
            rootCauses: catPair[1].map((rootCause: any) => {
              if (typeof rootCause === 'object' && rootCause.type === 'nested') {
                const newRootCause = { ...rootCause }
                newRootCause.data = convertv01Effects(rootCause.data)
                return newRootCause
              } else {
                return rootCause
              }
            }),
          }
        }),
      }
    })
  }

  // todo remove duplicate... to async version
  const deepRootCausesForEachNonAsync = (fishbone: any[], parents: any[], fn: (rc: any, parents: any[]) => any | null | undefined) => {
    for (const effect of fishbone) {
      const nrCats = effect?.categories?.length
      if (nrCats > 0) {
        for (let c = 0; c < nrCats; ++c) {
          const category = effect.categories[c]
          let nrRcs = category?.rootCauses?.length
          if (nrRcs > 0) {
            for (let r = 0; r < nrRcs; ++r) {
              const rc = category.rootCauses[r]
              let modRc = fn(rc, parents) // we call the callback in any case
              if (modRc === undefined) {
                // no change
                modRc = rc
              } else if (modRc === null) {
                // delete this rc.
                category.rootCauses.splice(r, 1)
                --nrRcs
                modRc = undefined
              } else {
                // update
                category.rootCauses[r] = modRc
              }
              if (modRc !== undefined) {
                // and if its a nested we do nest automatically:
                if (modRc?.type === 'nested') {
                  deepRootCausesForEachNonAsync(modRc.data, [...parents, modRc], fn)
                }
              }
            }
          }
        }
      }
    }
  }

  /// but don't allow delete. callback fn can modify directly
  const iterateAllFBElements = (fishbone: any[], parents: any[], fn: (type: string, elem: any, parent: any) => void) => {
    for (const effect of fishbone) {
      fn('effect', effect, fishbone)
      if (effect?.categories?.length) {
        for (const category of effect.categories) {
          fn('category', category, effect)
          if (category?.rootCauses?.length) {
            for (const rc of category.rootCauses) {
              fn('rc', rc, category)
              if (rc.type === 'nested') {
                iterateAllFBElements(rc.data, [...parents, rc], fn)
              }
            }
          }
        }
      }
    }
  }

  // convert data from prev. version 0.2
  const convertv02TextFields = (yamlObj: { fishbone: any[]; attributes: any | undefined; version: string | undefined }) => {
    // we have to modify directly the yamlObj passed: and not return a new obj.
    console.warn(`FBAEditorProvider.convertv02TextFields converting from v02 to v03 ...`)
    // update instructions, backgroundDescription and comments;
    deepRootCausesForEachNonAsync(yamlObj.fishbone, [], (rootCause) => {
      // Updating fields
      try {
        if (rootCause.props && typeof rootCause.props.instructions === 'string') {
          rootCause.props.instructions = { textValue: rootCause.props.instructions }
        }
        if (rootCause.props && typeof rootCause.props.backgroundDescription === 'string') {
          rootCause.props.backgroundDescription = { textValue: rootCause.props.backgroundDescription }
        }
        if (rootCause.props && typeof rootCause.props.comments === 'string') {
          rootCause.props.comments = { textValue: rootCause.props.comments }
        }
        return rootCause
      } catch (e: any) {
        console.warn(` FBAEditorProvider.convertv02TextFields got error ${e.type}:${e.message} migrating ${JSON.stringify(rootCause)}`)
        return null // this root cause will be deleted!
      }
    })
    console.log(`FBAEditorProvider.convertv02TextFields converting from v02 to v03 ... done`)
    yamlObj.version = '0.3'
  }

  // convert data from prev v0.3:
  const convertv03RestParameters = (yamlObj: { fishbone: any[]; attributes: any | undefined; version: string | undefined }) => {
    // we have to modify directly the yamlObj passed: and not return a new obj.
    console.assert(yamlObj.version === '0.3', `logical error! unexpected version=${yamlObj.version}`)
    if (yamlObj.version === '0.3') {
      console.warn(`FBAEditorProvider.convertv03RestParameters converting from v03 to v04 ...`)
      const updateSource = (obj: { source: string | { url: string } }) => {
        // old format was as well: source.url=...
        const srcString: string = typeof obj.source === 'string' ? obj.source : typeof obj.source?.url === 'string' ? obj.source.url : ''
        if (srcString.startsWith('ext:mbehr1.dlt-logs')) {
          // split into the components: path?cmd1=parm1&cmd2=parm2&...
          // parmx needs to be uri encoded
          const indexOfQ = srcString.indexOf('?')
          if (indexOfQ > 0) {
            const commandsNew: string[] = []
            const options = srcString.slice(indexOfQ + 1)
            const optionArr = options.split('&')
            for (const commandStr of optionArr) {
              const eqIdx = commandStr.indexOf('=')
              const command = commandStr.slice(0, eqIdx)
              const commandParams = commandStr.slice(eqIdx + 1)
              commandsNew.push(`${command}=${encodeURIComponent(commandParams)}`)
            }
            const newRequest = `${srcString.slice(0, indexOfQ)}?${commandsNew.join('&')}`
            console.warn(` converted (uri encoded)\n  ${JSON.stringify(obj)} to .source=\n  '${newRequest}'`)
            obj.source = newRequest
          }
        } else {
          if (typeof obj.source !== 'string') {
            // to get rid of the "source.url ones..."
            console.warn(` converted (.source.url to .source)\n  ${JSON.stringify(obj)} to .source=\n  '${srcString}'`)
            obj.source = srcString
          }
        }
      }

      // update all badge.source, badge2.source, filter.source for ext...dlt-logs...
      deepRootCausesForEachNonAsync(yamlObj.fishbone, [], (rc) => {
        try {
          if (rc.type === 'react' && rc.element === 'FBACheckbox' && typeof rc.props === 'object') {
            if ('filter' in rc.props && 'badge' in rc.props.filter) {
              if (!('badge' in rc.props)) {
                rc.props.badge = rc.props.filter.badge
                delete rc.props.filter['badge']
              }
            }
            if ('filter' in rc.props && 'badge2' in rc.props.filter) {
              if (!('badge2' in rc.props)) {
                rc.props.badge2 = rc.props.filter.badge2
                delete rc.props.filter['badge2']
              }
            }
            if ('badge' in rc.props && 'source' in rc.props.badge) {
              updateSource(rc.props.badge)
            }
            if ('badge2' in rc.props && 'source' in rc.props.badge2) {
              updateSource(rc.props.badge2)
            }
            if ('filter' in rc.props && 'source' in rc.props.filter) {
              updateSource(rc.props.filter)
            }
            // prev. we had filter.apply. -> change it consistently to filter.source as well.
            if ('filter' in rc.props && 'apply' in rc.props.filter) {
              if (!('source' in rc.props.filter)) {
                // if its there already we dont overwrite
                rc.props.filter.source = rc.props.filter.apply
                updateSource(rc.props.filter)
              } else {
                console.warn(
                  ` FBAEditorProvider.convertv03RestParameters deleting filter.apply as filter.source already exists while migrating ${JSON.stringify(
                    rc,
                  )}`,
                )
              }
              delete rc.props.filter['apply'] // we delete anyhow to cleanup
            }
            return rc
          }
          return undefined // no change
        } catch (e: any) {
          console.warn(` FBAEditorProvider.convertv03RestParameters got error ${e.type}:${e.message} migrating ${JSON.stringify(rc)}`)
          return null // this root cause will be deleted!
        }
      })

      // update all attributes with
      // <key>.dataProvider: {
      //          source: 'ext:mbehr1.dlt-logs/get/docs?ecu="${attributes.ecu}"',
      if (Array.isArray(yamlObj.attributes) && yamlObj.attributes.length > 0) {
        yamlObj.attributes.forEach((attr) => {
          const keyObj = attr[Object.keys(attr)[0]]
          if ('dataProvider' in keyObj && 'source' in keyObj.dataProvider) {
            updateSource(keyObj.dataProvider)
          }
        })
      }
      console.log(`FBAEditorProvider.convertv03RestParameters converting from v03 to v04 ... done`)
      yamlObj.version = '0.4'
    }
  }

  // convert data from prev v0.4: attributes change values to query only for current doc
  const convertv04Attributes = (yamlObj: { fishbone: any[]; attributes: any | undefined; version: string | undefined }) => {
    if (yamlObj.version === '0.4') {
      console.warn(`FBAEditorProvider.convertv04Attributes converting from v04 to v05 ...`)
      if (Array.isArray(yamlObj.attributes) && yamlObj.attributes.length > 0) {
        yamlObj.attributes.forEach((attr) => {
          const attrId = Object.keys(attr)[0]
          const keyObj = attr[attrId]
          if ('dataProvider' in keyObj) {
            switch (attrId) {
              case 'ecu':
                keyObj.dataProvider = {
                  source: 'ext:mbehr1.dlt-logs/get/docs/0',
                  jsonPath: '$.data.attributes.ecus[*].name',
                }
                break
              case 'sw':
                keyObj.dataProvider = {
                  // eslint-disable-next-line no-template-curly-in-string
                  source: `ext:mbehr1.dlt-logs/get/docs/0/ecus?ecu=${encodeURIComponent('"${attributes.ecu}"')}`,
                  jsonPath: '$.data[*].attributes.sws[*]',
                }
                break
              case 'lifecycles':
                keyObj.dataProvider = {
                  // eslint-disable-next-line no-template-curly-in-string
                  source: `ext:mbehr1.dlt-logs/get/docs/0/ecus?ecu=${encodeURIComponent('"${attributes.ecu}"')}`,
                  jsonPath: '$.data[*].attributes.lifecycles[*].attributes',
                }
                break
              default:
                break // skip
            }
          }
        })
      }
      console.warn(`FBAEditorProvider.convertv04Attributes converting from v04 to v05 ... done`)
      yamlObj.version = '0.5'
    }
  }

  // convert from prev. known formats:
  if (yamlObj?.version === '0.1') {
    // the effects storage has changed:
    if (yamlObj.fishbone) {
      const fbv02 = convertv01Effects(yamlObj.fishbone)
      console.log(`fbv02=`, fbv02)
      yamlObj.fishbone = fbv02
    }
    yamlObj.version = '0.2'
  }

  if (yamlObj?.version === '0.2') {
    // the instruction, background and comment field has changed from string to object:
    convertv02TextFields(yamlObj)
  }

  if (yamlObj?.version === '0.3') {
    // uri encoded parameter for dlt-logs rest queries:
    convertv03RestParameters(yamlObj)
  }

  if (yamlObj?.version === '0.4') {
    convertv04Attributes(yamlObj)
  }

  if (yamlObj?.version === '0.5') {
    yamlObj.version = '0.6' // change from js-yaml lib 3.x to 4.x
    // no further migration needed but to identify files in case of errors we create a backup
    if (yamlObj.backups === undefined) {
      yamlObj.backups = []
    }
    yamlObj.backups.push({
      date: Date.now(),
      reason: `conversion from v0.5 to v0.6`,
      textDeflated: zlib.deflateSync(text).toString('base64'),
    })
  }

  if (yamlObj?.version === '0.6') {
    console.warn(`FBAEditorProvider converting from v0.6 to v0.7 ...`)
    try {
      iterateAllFBElements(yamlObj.fishbone, [], (type, elem, parent) => {
        if (typeof elem !== 'object') {
          // some rcs are just strings
          return
        }
        if (!('fbUid' in elem)) {
          elem.fbUid = uid.randomUUID()
        }
      })
      if (Array.isArray(yamlObj.attributes) && yamlObj.attributes.length > 0) {
        for (const attr of yamlObj.attributes) {
          if (typeof attr === 'object' && !('fbUid' in attr)) {
            attr.fbUid = uid.randomUUID()
          }
        }
      }
      if (yamlObj.backups === undefined) {
        yamlObj.backups = []
      }
      yamlObj.backups.push({
        date: Date.now(),
        reason: `conversion from v0.6 to v0.7`,
        textDeflated: zlib.deflateSync(text).toString('base64'),
      })
      yamlObj.version = '0.7'
      console.log(`FBAEditorProvider converting from v0.6 to v0.7 done`)
    } catch (e) {
      console.error(`FBAEditorProvider converting from v0.6 to v0.7 got error: '${e}'`)
    }
  }

  // we're not forwards compatible.
  if (yamlObj?.version !== currentFBAFileVersion) {
    const msg = `Fishbone: The document uses unknown version ${yamlObj?.version}. Please check whether an extension update is available.`
    throw new Error(msg)
  }

  return {
    // todo return type and version as well! (will this cause harm?)
    // why not return yamlObj directly?
    attributes: yamlObj?.attributes,
    fishbone: yamlObj.fishbone,
    title: yamlObj.title || '<please add title to .fba>',
    backups: yamlObj.backups || [],
  }
}

export function fbaToString(fba: Fishbone): string {
  return yaml.dump(fba, { schema: yaml.JSON_SCHEMA, forceQuotes: true })
}

/**
 * parse a text as yaml and return the raw object.
 * This is supposed to be a fishbone/fba format but actually
 * does parse yet any yaml.
 *
 * @param text persisted text to parse as fba yaml
 * @returns raw object. no conversions/checks done yet.
 * @throws Error if the text is not valid yaml or not a valid fba
 */
export function fbaYamlFromText(text: string): any {
  try {
    const fbaYaml = yaml.load(text, { schema: yaml.JSON_SCHEMA })
    return fbaYaml
  } catch (e: any) {
    console.error(`fbaYamlFromText: Could not parse text. Context is not valid yaml e=${e.name}:${e.message}`)
    throw e
  }
}
