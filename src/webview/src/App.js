/**
 * copyright (c) 2020 - 2023, Matthias Behr
 *
 * todo list:
 * - add/edit attributes via UI
 * - add/edit filter via UI
 * - add/edit badges via UI
 * [x] add lifecycle selection
 * - rethink "react" class support (function as string parsed to js?)
 *
 * - use webpack (or something else) for proper react "app" bundling/generation incl. debugging support
 *   ( to get rid of src/webview yarn build, F5 (cmd+s...))
 *
 */

import React, { Component, createContext } from 'react'
import './App.css'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Checkbox from '@mui/material/Checkbox'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import FishboneChart from './components/fishbone/fishboneChart'
import { FormControlLabel, IconButton, Container, TextField, StyledEngineProvider, AppBar, Toolbar, Menu, MenuItem } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import Grid from '@mui/material/Grid'
import InputDataProvided from './components/dataProvider'
import FBACheckbox from './components/fbaCheckbox'
import SummaryDialog from './components/summaryDialog'
import OnBlurInputBase from './components/onBlurInputBase'
import { receivedResponse, customEventStack } from './util'
import HomeIcon from '@mui/icons-material/Home'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import FileOpenIcon from '@mui/icons-material/FileOpen'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import * as yaml from 'js-yaml'
import ShortUniqueId from 'short-unique-id'
var stableStringify = require('json-stable-stringify')

const uid = new ShortUniqueId.default({ length: 8 })

export const AttributesContext = createContext()

class MyCheckbox extends Component {
  render() {
    return (
      <Container>
        <Tooltip title={`a tooltip for ${this.props.name}`}>
          <FormControlLabel control={<Checkbox {...this.props} size='small'></Checkbox>} label={this.props.label} />
        </Tooltip>
        <IconButton size='small' aria-label='edit'>
          <EditIcon fontSize='small' color='primary' />
        </IconButton>
      </Container>
    )
  }
}

/**
 * copy a root cause element/object. Copies all but functions.
 * Assigns a new uid (fbUid) as well.
 * @param {*} rootCause
 */
function deepCopyRootCause(rootCause) {
  if (typeof rootCause === 'object') {
    switch (rootCause.type) {
      case 'react':
      case 'nested':
        try {
          const newObj = JSON.parse(
            JSON.stringify(rootCause, (key, value) => {
              if (typeof value === 'function') {
                return undefined
              }
              if (key === 'fbUid') return uid.randomUUID()
              return value
            }),
          )
          return newObj
        } catch (err) {
          console.warn(`deepCopyRootCause got error '${err}'`)
        }
        break
      default:
        console.warn(`deepCopyRootCause unknown type ='${rootCause.type}'`, rootCause)
        break
    }
  }
  return undefined
}

/**
 * copy a category object. Copies all but functions.
 * Assigns new uids (fbUid) as well (deeply for all)
 * @param {*} category
 */
function deepCopyCategory(category) {
  if (typeof category === 'object') {
    try {
      const newObj = JSON.parse(
        JSON.stringify(category, (key, value) => {
          if (typeof value === 'function') {
            return undefined
          }
          if (key === 'fbUid') return uid.randomUUID()
          return value
        }),
      )
      return newObj
    } catch (err) {
      console.warn(`deepCategory got error '${err}'`)
    }
  }
  return undefined
}

export default class App extends Component {
  logMsg(msg) {
    console.log('logPostMsg:' + msg)
    this.props.vscode.postMessage({ type: 'log', message: 'logMsg:' + msg })
  }

  addInlineElements = (rootcause) => {
    if (typeof rootcause === 'object') {
      if (rootcause.type === 'react') {
        if (!('elementName' in rootcause)) {
          switch (rootcause.element) {
            case 'MyCheckbox':
              rootcause.elementName = MyCheckbox
              rootcause.props.onChange = this.handleInputChange.bind(this, rootcause)
              break
            case 'FBACheckbox':
              rootcause.elementName = FBACheckbox
              rootcause.props.onChange = this.handleInputChange.bind(this, rootcause)
              break
            default: // do nothing
              console.log(`addInlineElements found unknown object rootcause element:'${JSON.stringify(rootcause)}'`)
              break
          }
        }
      }
    }
  }

  /**
   * return the data object for the current path
   * @param {*} curPath array of objects with {title, effectIndex}
   * @param {*} data full tree of fishbone chart data, i.e. root chart.
   * @returns data object for the current path or null if not available
   */
  getCurData(curPath, data) {
    console.log(`getCurData(curPath=${JSON.stringify(curPath)}) called...`)
    if (!curPath.length) return null
    if (curPath.length === 1) return data
    // a path consists of e.g. [ (roottitle, effectIndex1), (childTitle, effectIndex2),... ]
    // the childFB1 has to be reachable via an nested type rootcause named "childFB1title" within roottitle/effectIndex1

    // we start checking from the 2nd one (level/idx 1):
    let prevData = data
    let prevEffectIndex = curPath[0].effectIndex

    for (let level = 1; level < curPath.length; ++level) {
      const childTitle = curPath[level].title
      // does prevData has at prevEffectIndex a rootcaused typed "nested" and named "childTitle?
      const effectObj = prevData.length > prevEffectIndex ? prevData[prevEffectIndex] : [null, null]
      if (effectObj.categories) {
        // array of [{name:category, rootCauses:[rootcauses]}]
        const categories = effectObj.categories
        // console.log(`categories=`, categories);

        let found = false
        console.log(`categories.length = ${categories.length}`)
        for (const category of categories) {
          // console.log(`category = ${category.name} rootCauses.length=${category?.rootCauses.length}`);
          for (const rootcause of category?.rootCauses) {
            if (typeof rootcause === 'object') {
              // console.log(`found rootcause type=${rootcause.type} ${rootcause.title}`);
              if (rootcause.type === 'nested' && rootcause.title === childTitle) {
                // got it
                console.log(`getCurData found ${childTitle}`)
                prevData = rootcause.data
                prevEffectIndex = curPath[level].effectIndex
                found = true
                break
              }
            }
          }
          if (found) break
        }
        if (!found) {
          console.log(`didnt found '${childTitle}'`)
          return null
        }
      } else {
        console.log(`got no categories!`)
        return null
      }
    }
    console.log(`getCurData returning `, prevData, data)
    return prevData
  }

  /**
   * Returns the longest matching path. Modifies the curPath!
   * @param {*} curPath current path array. Will be shortend if not fitting!
   * @param {*} data  root fishbone data node.
   * @param {*} firstTitle first/root chart title
   * @returns longest matching path (in most cases a shortened curPath)
   */
  matchingFbPath(curPath, data, firstTitle) {
    const matchingPath = [{ title: firstTitle, effectIndex: 0 }]
    console.log(`matchingFbPath(curPath.length=${curPath.length}) called`)
    if (curPath[0]?.title !== firstTitle) return matchingPath

    // now check from the end:
    // we could do binary search but for this use case most of the time
    // the path doesn't change anyhow!
    while (curPath.length > 0) {
      const pathData = this.getCurData(curPath, data)
      if (!pathData) {
        curPath.pop()
      } else return curPath
    }
    console.log(`matchingFbPath(curPath.length=${curPath.length}) done`)
    if (curPath.length > 0) return curPath
    return matchingPath
  }

  constructor(props) {
    super(props)
    //this.handleInputChange = this.handleInputChange.bind(this);

    const vsCodeState = props.vscode.getState()

    // need to convert to class names...
    // done on the fly/need now this.parseFBData(vsCodeState?.data || []);

    // console.log(`vsCodeState=${JSON.stringify(vsCodeState)}`);

    this.state = vsCodeState || (props.initialData ? { data: props.initialData, title: '<no title>' } : { data: [], title: '<no title>' })

    if (!this.state?.fbPath?.length) {
      this.state.fbPath = [{ title: this.state.title, effectIndex: 0 }]
    }

    // cache attr changes (ugly, but as we do modify the attribute elements directly and the comparision is only done shallow...)
    this.oldAttributesStringified = stableStringify(this.state.attributes)

    // Ensure summary dialog is initially disabled
    this.state['showSummaryDialog'] = false

    this.logMsg(`from App/constructor state.title=${this.state.title}`)
    window.addEventListener('message', (event) => {
      const msg = event.data
      //console.log(`App received msg:`);
      //console.log(msg);
      switch (msg.type) {
        case 'update':
          // do we need to update the fbPath?
          // check whether the current path is still valid, if not use the first matching parts:
          const fbaFsAuthority = msg.fbaFsAuthority
          //console.log(`App.message.update state.fbPath=${JSON.stringify(this.state.fbPath)} for fbaFsAuthority=${fbaFsAuthority}`)
          const newFbPath = this.matchingFbPath(this.state.fbPath, msg.data, msg.title)
          //console.log(`App.message.update  newPath=${JSON.stringify(newFbPath)}`)

          // we store the non-modified data in vscode.state (e.g. with react:MyCheckbox as string)
          this.props.vscode.setState({
            fbaFsAuthority,
            data: msg.data,
            title: msg.title,
            attributes: msg.attributes,
            fbPath: newFbPath,
          }) // todo shall we store any other data?

          // distribute new attributes only if they change to prevent requeries:
          {
            const newAttr = stableStringify(msg.attributes)
            if (this.oldAttributesStringified !== newAttr) {
              this.oldAttributesStringified = newAttr
              this.setState({ attributes: msg.attributes })
            } else {
              console.log(`App.message.update skipped attributes update!`)
            }
          }
          this.setState({
            fbaFsAuthority,
            data: msg.data,
            title: msg.title,
            fbPath: newFbPath,
            clipboard: this.state?.clipboard !== undefined && !this.state.clipboard.doCut ? this.state.clipboard : undefined,
          })
          break
        case 'sAr':
          receivedResponse(msg)
          break
        case 'CustomEvent':
          {
            console.log(`App.onMessage(CustomEvent eventType=${msg.eventType} detail=${JSON.stringify(msg.detail)}`)
            //const event = new CustomEvent(msg.eventType, { bubbles: false, cancelable: true, detail: msg.detail });
            const event = { eventType: msg.eventType, detail: msg.detail }
            //document.dispatchEvent(event);
            if (customEventStack.length > 0) {
              // call the hooks from the stack until one returns false:
              for (var i = customEventStack.length - 1; i >= 0; i--) {
                const [evType, handler] = customEventStack[i]
                if (evType !== msg.eventType) continue
                if (!handler(event)) {
                  break
                }
              }
            } else {
              console.log(
                `App.onMessage(CustomEvent eventType=${msg.eventType} detail=${JSON.stringify(
                  msg.detail,
                )} got no entries in customEventStack`,
              )
            }
          }
          break
        case 'onDidChangeActiveRestQueryDoc':
          console.log(`App.onDidChangeActiveRestQueryDoc ext=${msg.ext} uri=${msg.uri}`)
          // for now simply update the attributes, to retrigger a badge redraw
          // console.warn(`App.onDidChangeActiveRestQueryDoc  attributes=${JSON.stringify(this.state.attributes)}`);
          // this.oldAttributesStringified stays unchanged...
          this.setState((state) => {
            return { attributes: [...state.attributes] }
          })
          break
        case 'onDidChangeActiveColorTheme':
          console.log(`App.onDidChangeActiveColorTheme kind=${msg.kind}`)
          // for now simply change title to force render:
          this.setState((state) => {
            return { title: state.title }
          })
          break
        default:
          console.warn(`App received unknown type='${msg.type}' msg:`, msg)
          break
      }
    })
  }

  handleFBStateChange(fbState) {
    console.log(`App.handleFBStateChange fbState=`, fbState)
    if ('childFBData' in fbState) {
      const fbData = fbState.childFBData
      if (Array.isArray(fbData)) {
        const [, childTitle] = fbData
        console.log(`App.handleFBStateChange nest into '${childTitle}'`)
        console.log(`App.handleFBStateChange curPath=`, this?.state?.fbPath)
        const curPath = this.state.fbPath //
        curPath.push({ title: childTitle, effectIndex: 0 })
        this.setState({ fbPath: curPath })
      } else {
        // go back to prev.
        console.log(`App.handleFBStateChange curPath=`, this?.state?.fbPath)
        const curPath = this.state.fbPath //
        curPath.pop()
        this.setState({ fbPath: curPath }) // todo use setAllStates with new params "noDocUpdate?"
      }
      this.props.vscode.setState({
        fbaFsAuthority: this.state.fbaFsAuthority,
        data: this.state.data,
        title: this.state.title,
        attributes: this.state.attributes,
        fbPath: this.state.fbPath,
      }) // todo shall we store any other data?
    }
    if ('effectIndex' in fbState) {
      // update fbPath last element:
      if (!this.state?.fbPath.length) {
        throw new Error(`handleFBStateChange effectIndex change without fbPath!`)
      }
      // modify directly and call setState... ? dirty
      console.log(`App.handleFBStateChange curPath=`, this?.state?.fbPath)
      const curPath = this.state.fbPath //
      curPath[this.state.fbPath.length - 1].effectIndex = fbState.effectIndex || 0
      this.setState({ fbPath: curPath })
      this.props.vscode.setState({
        fbaFsAuthority: this.state.fbaFsAuthority,
        data: this.state.data,
        title: this.state.title,
        attributes: this.state.attributes,
        fbPath: curPath,
      }) // todo shall we store any other data?
    }
  }

  handleInputChange(object, event, propsField) {
    console.log(`handleInputChange this=`, this)
    console.log(`handleInputChange object=`, object)
    console.log(`handleInputChange event=`, event)
    console.log(`handleInputChange propsField=`, propsField)

    // if propsField is provided this determines the field to update (e.g. object.props[propsField]=...)
    const target = event.target
    let values = target.values // this can be an array like [{<name>:<value>}] in this case propsField will be ignored!
    let value = target.type === 'checkbox' ? target.checked : target.value

    if (values && propsField) {
      console.error(`logical error! only values or propsFields must be used!`)
      throw new Error(`logical error! only values or propsFields must be used!`)
    }

    const propsFieldName = propsField !== undefined ? propsField : target.type === 'checkbox' ? 'checked' : 'value'

    if (!values) {
      values = { [propsFieldName]: value }
    }

    const name = target.name
    const id = target.id
    console.log(
      `App.handleInputChange(id=${id}, type=${target.type}, name=${name}, value=${value} propsField=${propsField} key=${
        target.key
      } object.keys=${Object.keys(object).toString()} values=`,
      values,
    )

    let didUpdate = false

    if (target.type === 'datetime-local') {
      const tempVal = new Date(value)
      // no timeshift needed? const date = new Date((tempVal.valueOf() + this.timeZoneOffsetInMs));
      value = tempVal.toISOString()
    }

    if (target.type === 'checkbox') {
      if ('props' in object) {
        object.props.checked = value
        didUpdate = true
      }
      if ('checked' in object) {
        object.checked = value
        didUpdate = true
      }
      // todo for attributes!
    } else {
      if ('props' in object) {
        for (const [key, value] of Object.entries(values)) {
          object.props[key] = value
        }
        /*object.props[propsFieldName] = value; */ didUpdate = true
      } else {
        // for attributes object contains just one key: (the name)
        const { fbUid: _a, ...objectWoFbUid } = object
        if (Object.keys(objectWoFbUid).length === 1) {
          console.log(`App.handleInputChange found attribute like object to update: ${JSON.stringify(object)}`)
          const curValue = object[Object.keys(objectWoFbUid)[0]]
          if (typeof curValue === 'object') {
            const attrObj = curValue
            console.log(`App.handleInputChange found object inside attribute to update: ${JSON.stringify(attrObj)}`)
            for (const [key, value] of Object.entries(values)) {
              attrObj[key] = value
              didUpdate = true
              console.log(`App.handleInputChange updated object inside attribute to: ${JSON.stringify(object)}`)
            }
          } else {
            // update that one directly todo: needs update with values logic!
            object[Object.keys(object)[0]] = value
            console.warn(`App.handleInputChange updated flat attribute to: ${JSON.stringify(object)}`)
            didUpdate = true
          }
        } else {
          // update the key directly? (e.g. for effect(=object) name(propsField) change)
          for (const [key, value] of Object.entries(values)) {
            if (key in object) {
              object[key] = value
              didUpdate = true
            } else {
              console.warn(
                `handleInputChange didn't found key '${key}' in object to update to value '${JSON.stringify(
                  value,
                )}' in object: '${JSON.stringify(object)}'!`,
              )
            }
          }
        }
      }
    }

    if (didUpdate) {
      console.log(`updated object to ${JSON.stringify(object)}`)
      this.setAllStates()
    } else {
      console.warn(`App.handleInputChange didn't found property to update!`)
    }
  }

  /**
   * Updates state and the cached vscode.setState and posts the data to the
   * extension for updating the document.
   * @param {*} newStateFragements fragment of the state that shall be updated
   */
  setAllStates(newStateFragements) {
    //console.log(`setAllStates newStateFragments=`, newStateFragements);
    //console.log(`setAllStates state=`, this.state);
    const newFragObj = newStateFragements || {}

    // did the attributes values changes? if yes, we do need to parse a new attr. as values are modified directly...
    const newAttr = stableStringify('attributes' in newFragObj ? newFragObj.attributes : this.state.attributes)
    if (newAttr !== this.oldAttributesStringified) {
      console.log(`App.setAllStates attributes did change.`)
      this.oldAttributesStringified = newAttr
      newFragObj.attributes = JSON.parse(newAttr)
    }

    this.setState(newFragObj, () => {
      const state = this.state
      //console.log(`setAllStates cb state=`, state);
      this.props.vscode.setState({
        fbaFsAuthority: state.fbaFsAuthority,
        data: state.data,
        title: state.title,
        attributes: state.attributes,
        fbPath: state.fbPath,
      }) // todo shall we store any other data?
      // we parse and unparse to get rid of the elementName modifications... (functions)
      // storing all but the fbPath... (todo: why not?)
      this.props.vscode.postMessage({
        type: 'update',
        data: JSON.parse(JSON.stringify(state.data)),
        title: state.title,
        attributes: state.attributes,
      })
    })
  }

  /**
   * Opens a new modal dialog to present all data in a summary view
   */
  onShowSummary() {
    this.setState({ showSummaryDialog: true })
  }

  /**
   * resets all entry values and comments
   * Does not reset the backgroundDesc, instructions.
   * It's intended to reset single analyis settings.
   * Resets all effects and all nested fishbones starting
   * from the root one.
   * Resets attributes as well.
   */
  onResetAllEntries(reimport) {
    console.log(`onResetAllEntries(reimport=${reimport}) called`)
    //const data = this.getCurData(this.state.fbPath, this.state.data)

    const resetData = (data, reimport) => {
      data.forEach((effect) => {
        console.log(`effect.name=${effect.name}`)
        effect.categories.forEach((category) => {
          for (let i = 0; i < category.rootCauses.length; ++i) {
            const rc = category.rootCauses[i]
            if (typeof rc === 'object') {
              if ('props' in rc) {
                const props = rc.props
                const newProps = { ...props }
                if ('checked' in props) {
                  newProps['checked'] = null
                  rc.props = newProps
                }
                if ('value' in props) {
                  newProps['value'] = null
                  rc.props = newProps
                }
                if ('comments' in props) {
                  newProps['comments'] = null
                  rc.props = newProps
                }
                console.log(`reset rc.props=${JSON.stringify(rc.props)}`)
                category.rootCauses.splice(i, 1, { ...rc }) // create a new obj.
              }
              if (rc.type === 'nested') {
                resetData(rc.data, reimport)
                // we do mark whether a reimport is wanted:
                rc['reimport'] = reimport ? true : undefined
              }
            }
          }
        })
      })
    }
    resetData(this.state.data, reimport)
    // if data is not the state.date :
    // now we have to make data a new object... to trigger a redraw of this object...
    // it's a problem as data (except for the top level fb not a direct shallow member of state)
    // todo find a better solution...
    // seems its not needed as any state updates (even without changes?) retrigger a render incl.
    // subcomponents. (see memo to avoid that). This might change in the future...
    /*
    if (false && data !== this.state.data) {
      const parData = this.getCurData(this.state.fbPath.slice(0, -1), this.state.data);
      // now we need to find the rootcause:
      parData.forEach(effect => {
        effect.categories.forEach(category => {
          category.rootCauses.forEach(rc => {
            if (typeof rc === 'object' && rc.type === 'nested' && rc.data === data) {
              console.log(`found rootCause to update rc.title=${rc.title}`);
              rc.data = [...data.map(effect => { return { ...effect }; })];
            }
          });
        });
      });
    } */

    // reset attributes:
    this.state.attributes.forEach((attribute) => {
      const attrName = Object.keys(attribute).find((key) => key !== 'fbUid')
      const attrObj = attribute[attrName]
      if ('value' in attrObj) {
        attrObj['value'] = null
      }
    })

    this.setAllStates()
  }

  /**
   * add dlt attributes for ecu and lifecycles
   */
  onAddDLTAttributes() {
    console.log(`onAddDLTAttributes()`)
    const newAttrs = [...this.state.attributes]
    newAttrs.push({
      ecu: {
        fbUid: uid.randomUUID(),
        label: 'ECU identifier',
        dataProvider: {
          source: 'ext:mbehr1.dlt-logs/get/docs/0',
          jsonPath: '$.data.attributes.ecus[*].name',
        },
        value: null,
      },
    })

    newAttrs.push({
      sw: {
        fbUid: uid.randomUUID(),
        label: 'SW name',
        dataProvider: {
          // eslint-disable-next-line no-template-curly-in-string
          source: `ext:mbehr1.dlt-logs/get/docs/0/ecus?ecu=${encodeURIComponent('"${attributes.ecu}"')}`,
          jsonPath: '$.data[*].attributes.sws[*]',
        },
        value: null,
      },
    })

    newAttrs.push({
      lifecycles: {
        fbUid: uid.randomUUID(),
        label: 'Lifecycles',
        multiple: true,
        dataProvider: {
          // eslint-disable-next-line no-template-curly-in-string
          source: `ext:mbehr1.dlt-logs/get/docs/0/ecus?ecu=${encodeURIComponent('"${attributes.ecu}"')}`,
          jsonPath: '$.data[*].attributes.lifecycles[*].attributes',
        },
        value: null,
      },
    })

    this.setAllStates({ attributes: newAttrs })
  }

  /**
   * Add a new root cause to category...
   * @param {*} type type to be added. 'FBACheckbox','nested' or 'import'
   * @param {*} data
   * @param {*} effectIndex
   * @param {*} category category to add the root cause to
   */
  onAddRootCause(type, data, effectIndex, category) {
    console.log(`onAddRootCause (type='${type}' at category=${category?.name}`)
    if (!category) return
    const rootCauses = category.rootCauses
    let insertIndex = rootCauses.length
    let newRootCause = undefined
    switch (type) {
      case 'FBACheckbox':
        newRootCause = {
          fbUid: uid.randomUUID(),
          type: 'react',
          element: 'FBACheckbox',
          props: {
            // todo do we need name?
            label: `root cause ${rootCauses.length + 1}`,
            value: null,
          },
        }
        break
      case 'nested':
        newRootCause = {
          fbUid: uid.randomUUID(),
          type: 'nested',
          title: `nested fb ${rootCauses.length + 1}`,
          data: [
            {
              fbUid: uid.randomUUID(),
              name: 'effect 1',
              categories: [{ fbUid: uid.randomUUID(), name: 'category 1', rootCauses: [] }],
            },
          ],
        }
        break
      case 'import':
        /* we create just an empty 'import' one
           and the fbaEditor side will handle the rest
           i.e. add open file dialog,... and change to nested.
           we could as well send a special command but then 
           we have to pass the location to where to add it to as 
           parameters...
        */
        newRootCause = {
          type: 'import',
          title: '<pending>',
          data: [],
        }
        break
      default:
        console.warn(`onAddRootCause unknown type '${type}'`)
        break
    }
    if (newRootCause !== undefined) {
      rootCauses.splice(insertIndex, 0, newRootCause)
      this.setAllStates()
    }
  }

  /**
   * add a category to the effect indexed by data[effectIndex]
   * @param {*} data
   * @param {*} effectIndex
   * @param {*} category category used to select command, can be undefined!
   * The new category will be added before this one if provided.
   */
  onAddCategory(data, effectIndex, category) {
    console.log(`onAddCategory called. effectIndex = ${effectIndex} data=`, data)
    console.log(`onAddCategory called. category=`, category)
    let insertIndex = data[effectIndex].categories.length
    if (category) {
      // find the category and use that as insert index:
      const catIdx = data[effectIndex].categories.findIndex((element) => element === category)
      if (catIdx >= 0) {
        insertIndex = catIdx
      }
    }
    data[effectIndex].categories.splice(insertIndex, 0, {
      fbUid: uid.randomUUID(),
      name: `category ${data[effectIndex].categories.length + 1}`,
      rootCauses: [],
    })
    this.setAllStates()
  }

  onAddEffect(data, effectIndex) {
    console.log(`onAddEffect called. effectIndex = ${effectIndex} data=`, data)
    data.splice(effectIndex + 1, 0, {
      fbUid: uid.randomUUID(),
      name: `effect ${effectIndex + 2}`,
      categories: [{ fbUid: uid.randomUUID(), name: `category 1`, rootCauses: [] }],
    }) // todo add one root cause?

    // we do select the new one
    const curPath = this.state.fbPath
    // console.log(`onDeleteEffect called. curPath =`, curPath);
    curPath[this.state.fbPath.length - 1].effectIndex = effectIndex + 1

    this.setAllStates()
  }

  onDeleteEffect(data, effectIndex) {
    console.log(`onDeleteEffect called. effectIndex = ${effectIndex} data=`, data)
    if (data.length <= 1) return // we dont allow to delete the last effect
    data.splice(effectIndex, 1)

    // we do select the prev one as next one
    const curPath = this.state.fbPath
    // console.log(`onDeleteEffect called. curPath =`, curPath);
    curPath[this.state.fbPath.length - 1].effectIndex = effectIndex > 0 ? effectIndex - 1 : 0

    this.setAllStates()
  }

  onDeleteCategory(data, effectIndex, category, options) {
    console.log(`onDeleteCategory called. effectIndex = ${effectIndex} data=`, data)
    console.log(`onDeleteCategory called. category.name=${category.name}`, category)

    // don't support deleting the last category:
    if (data[effectIndex].categories.length <= 1) return

    // find the category and delete it:
    const catIdx = data[effectIndex].categories.findIndex((element) => element === category)
    if (catIdx >= 0) {
      console.log(`found element ${catIdx} to delete:`, data[effectIndex].categories[catIdx])
      data[effectIndex].categories.splice(catIdx, 1)
      if (!options?.dontCallSetAllStates) {
        this.setAllStates()
      }
    }
  }

  /**
   * Callback to delete a rootcause
   * @param data data object
   * @param effectIndex effectIndex used
   * @param category category that is the parent/contains the rootcause
   * @param {*} rootcause object to the rootcause to delete
   */
  onDeleteRootCause(data, effectIndex, category, rootCause, options) {
    console.log(`onDeleteRootCause() options=${JSON.stringify(options)} object=`, rootCause)

    let found = false
    for (let i = 0; !found && i < category.rootCauses.length; ++i) {
      const rc2 = category.rootCauses[i]
      if (rc2 === rootCause) {
        category.rootCauses.splice(i, 1)
        if (options && options.dontCallSetAllStates) {
          console.log(`onDeleteRootCause not calling setAllStates()`)
        } else {
          this.setAllStates()
        }
        found = true
      }
    }
    if (!found) {
      console.warn(`onDeleteRootCause didn't found rc to delete!`)
    }
  }

  onCopy(doCut, type, data, effectIndex, category, rootCause) {
    console.log(`onCopy(doCut=${doCut}, type=${type}) category=`, category)
    // console.log(`onCopy() rootCause=`, rootCause);
    this.setState({
      clipboard: {
        doCut: doCut,
        type: type,
        obj: rootCause !== undefined ? rootCause : category,
        data: data,
        effectIndex: effectIndex,
        category: category,
      },
    })
  }

  /**
   * paste the data currently contained in state.clipboard to the
   *  rootCause if !== undefined
   *  category if !== undefined (todo else effect?)
   * @param {*} data
   * @param {*} effectIndex
   * @param {*} category
   * @param {*} rootCause
   */
  onPaste(data, effectIndex, category, rootCause) {
    // event is passed as well?
    //console.log(`onPaste() data=`, data);
    console.log(`onPaste() effectIndex=`, effectIndex)
    // console.log(`onPaste() category=`, category);
    // console.log(`onPaste() rootCause=`, rootCause);
    console.log(`onPaste() state.clipboard=`, this.state.clipboard)

    if (this.state.clipboard === undefined) return

    const doCut = this.state.clipboard.doCut
    let didInsert = false
    switch (this.state.clipboard.type) {
      case 'rootcause':
        if (category !== undefined) {
          // insert rootCauses before this rootCause
          const rootCauses = category.rootCauses
          let insertIndex = rootCause !== undefined ? rootCauses.findIndex((r) => r === rootCause) : rootCauses.length
          if (insertIndex >= 0) {
            let newRootCause = doCut ? this.state.clipboard.obj : deepCopyRootCause(this.state.clipboard.obj)
            if (newRootCause !== undefined) {
              if (!doCut) {
                switch (newRootCause.type) {
                  case 'react':
                    if (newRootCause?.props?.label) {
                      newRootCause.props.label += ' copy'
                    }
                    break
                  case 'nested':
                    if (newRootCause?.title) {
                      newRootCause.title += ' copy'
                    }
                    break
                  default:
                }
              }
              rootCauses.splice(insertIndex, 0, newRootCause)
              didInsert = true
            }
          }
        }
        break
      case 'category':
        // insert category before this category (or at the end if category undefined)
        // rootcause should be undefined here... (we do just ignore it)
        // find the category and use that as insert index:
        const catIdx =
          category !== undefined
            ? data[effectIndex].categories.findIndex((element) => element === category)
            : data[effectIndex].categories.length
        if (catIdx >= 0) {
          let newCategory = doCut ? this.state.clipboard.obj : deepCopyCategory(this.state.clipboard.obj)
          if (newCategory !== undefined) {
            if (!doCut) {
              if (newCategory?.name) {
                newCategory.name += ' copy'
              }
            }
            data[effectIndex].categories.splice(catIdx, 0, newCategory)
            didInsert = true
          }
        }
        break
      default:
        console.warn(`onPaste with type '${this.state.clipboard.type}' not supported yet`)
    }

    if (didInsert && doCut) {
      // delete the clipboard element...
      switch (this.state.clipboard.type) {
        case 'rootcause':
          this.onDeleteRootCause(
            this.state.clipboard.data,
            this.state.clipboard.effectIndex,
            this.state.clipboard.category,
            this.state.clipboard.obj,
            { dontCallSetAllStates: true },
          )
          break
        case 'category':
          this.onDeleteCategory(this.state.clipboard.data, this.state.clipboard.effectIndex, this.state.clipboard.category, {
            dontCallSetAllStates: true,
          })
          break
        default:
      }
    }
    if (didInsert) {
      this.setAllStates({ clipboard: undefined })
    }
  }

  render() {
    const isStandaloneApi = this.props.vscode.isStandaloneApi
    console.log(`App render (title=${this.state.title}) standalone=${isStandaloneApi}`) // state.data: ${JSON.stringify(this.state.data)}`);

    // hack to get the css variables from vscode:
    const vscodeStyles = window.getComputedStyle(document.body)
    const haveVscodeStyles = vscodeStyles.getPropertyValue('--vscode-editor-background').length > 0

    const theme = createTheme(
      haveVscodeStyles
        ? {
            palette: {
              common: {
                black: '#ff0000',
              },
              background: {
                paper: vscodeStyles.getPropertyValue('--vscode-editor-background'),
              },
              // primary: {
              //main: vscodeStyles.getPropertyValue('--vscode-menu-background'),
              //contrastText: vscodeStyles.getPropertyValue('--vscode-menu-foreground'),
              //},
              text: {
                primary: vscodeStyles.getPropertyValue('--vscode-foreground'),
                secondary: vscodeStyles.getPropertyValue('--vscode-descriptionForeground'),
                disabled: '#ff0000',
              },
            },
            typography: {
              // looks weird?        fontSize: 'var(--vscode-font-size)',
              fontFamily: vscodeStyles.getPropertyValue('--vscode-font-family'),
              // looks weird?        fontWeightRegular: 'var(--vscode-font-weight)'
            },
            components: {
              MuiChip: {
                styleOverrides: {
                  colorSecondary: {
                    color: vscodeStyles.getPropertyValue('--vscode-button-secondaryForeground'),
                    backgroundColor: vscodeStyles.getPropertyValue('--vscode-button-secondaryBackground'),
                  },
                },
              },
              MuiIconButton: {
                styleOverrides: {
                  colorPrimary: {
                    color: vscodeStyles.getPropertyValue('--vscode-button-background'),
                    '&:hover': {
                      color: vscodeStyles.getPropertyValue('--vscode-button-hoverBackground'),
                    },
                  },
                  colorSecondary: {
                    // style={{ color: vscodeStyles.getPropertyValue('--vscode-button-secondaryForeground'), backgroundColor: vscodeStyles.getPropertyValue('--vscode-button-secondaryBackground'), }}
                    color: vscodeStyles.getPropertyValue('--vscode-button-secondaryBackground'),
                    '&:hover': {
                      color: vscodeStyles.getPropertyValue('--vscode-button-secondaryHoverBackground'),
                    },
                  },
                  sizeSmall: {
                    padding: '3px',
                  },
                },
              },
              MuiRadio: {
                styleOverrides: {
                  colorPrimary: {
                    color: vscodeStyles.getPropertyValue('--vscode-button-background'),
                    '&:hover': {
                      color: vscodeStyles.getPropertyValue('--vscode-button-hoverBackground'),
                    },
                    '&.Mui-checked': {
                      color: vscodeStyles.getPropertyValue('--vscode-button-background'),
                    },
                  },
                },
              },
              MuiSwitch: {
                styleOverrides: {
                  '.MuiSwitch-track': {
                    backgroundColor: vscodeStyles.getPropertyValue('--vscode-badge-foreground'),
                  },
                  colorSecondary: {
                    color: vscodeStyles.getPropertyValue('--vscode-badge-background'),
                    '&.Mui-checked': {
                      color: vscodeStyles.getPropertyValue('--vscode-badge-background'),
                    },
                    '&.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: vscodeStyles.getPropertyValue('--vscode-badge-foreground'),
                    },
                    '&.Mui-disabled + .MuiSwitch-track': {
                      backgroundColor: vscodeStyles.getPropertyValue('--vscode-badge-foreground'),
                    },
                  },
                },
              },
              MuiButton: {
                styleOverrides: {
                  textPrimary: {
                    color: vscodeStyles.getPropertyValue('--vscode-button-foreground'),
                    background: vscodeStyles.getPropertyValue('--vscode-button-background'),
                    '&:hover': {
                      backgroundColor: vscodeStyles.getPropertyValue('--vscode-button-hoverBackground'),
                    },
                  },
                  textSecondary: {
                    color: vscodeStyles.getPropertyValue('--vscode-button-secondaryForeground'),
                    background: vscodeStyles.getPropertyValue('--vscode-button-secondaryBackground'),
                    '&:hover': {
                      backgroundColor: vscodeStyles.getPropertyValue('--vscode-button-secondaryHoverBackground'),
                    },
                  }, // todo support inherit color for buttons?
                  outlinedPrimary: {
                    color: vscodeStyles.getPropertyValue('--vscode-foreground'), // regular foreground
                    borderColor: vscodeStyles.getPropertyValue('--vscode-button-background'),
                    '&:hover': {
                      color: vscodeStyles.getPropertyValue('--vscode-editor-foreground'),
                      borderColor: vscodeStyles.getPropertyValue('--vscode-button-hoverBackground'),
                    },
                  },
                  outlinedSecondary: {
                    color: vscodeStyles.getPropertyValue('--vscode-foreground'), // regular foreground for contrast
                    borderColor: vscodeStyles.getPropertyValue('--vscode-button-secondaryBackground'),
                    '&:hover': {
                      color: vscodeStyles.getPropertyValue('--vscode-editor-foreground'),
                      borderColor: vscodeStyles.getPropertyValue('--vscode-button-secondaryHoverBackground'),
                    },
                  },
                },
              },
              /* todo investigate later ... MuiCheckbox: {
colorPrimary: {
// background: vscodeStyles.getPropertyValue('--vscode-checkbox-background'),
// borderColor: vscodeStyles.getPropertyValue('--vscode-checkbox-border'),
color: vscodeStyles.getPropertyValue('--vscode-checkbox-foreground'),
}
} */
            },
          }
        : {},
    )

    // attribute section
    let attributeSection = undefined
    if (this.state.attributes?.length > 0) {
      console.log(`App.render() adding ${this.state.attributes.length} attributes:`)

      /*
      const useStyles = makeStyles((theme) => ({
  root: {
    '& .MuiTextField-root': {
      margin: theme.spacing(1),
      width: '25ch',
    },
  },
}));
      */

      const formStyle = {
        margin: 3,
        width: '80ch',
        spacing: 2,
      }

      // add attributes:
      const attrs = this.state.attributes.map((attribute) => this.getUIForAttribute(attribute))
      attributeSection = (
        <Paper>
          <Grid container spacing={2}>
            <Grid item sm={6} container>
              <Typography align='left' gutterBottom variant='h6'>
                Attributes:
              </Typography>
              <form style={formStyle} noValidate autoComplete='off'>
                <Grid container spacing={2}>
                  {attrs}
                </Grid>
              </form>
            </Grid>
          </Grid>
        </Paper>
      )
    }

    const handleBreadcrumbClick = (index) => {
      console.log(`handleBreadcrumbClick ev=`, index)
      // we encode the level in href
      const level = index
      console.log(`handleBreadcrumbClick level=${level}`)
      // shorten path to that level:
      const curPath = this.state.fbPath
      while (curPath.length > level + 1) curPath.pop()
      this.setState({ fbPath: curPath })
    }

    const onFbPathChange = (path) => {
      this.setState({ fbPath: path })
    }

    const handleChangeTitle = (value) => {
      console.log(`handleChangeTitle value='${value}'`)
      if (this.state.fbPath.length === 1) {
        this.setAllStates({ title: value })
      } else {
        // it's a bit tricky to get to the current title...
        // its the title of the rootcause with .title property...
        // so we do need to search for that root cause:
        const parentData = this.getCurData(this.state.fbPath.slice(0, -1), this.state.data)
        // search all effects and categories:
        parentData.forEach((effect) => {
          effect.categories.forEach((category) => {
            category.rootCauses.forEach((rootCause) => {
              if (
                typeof rootCause === 'object' &&
                rootCause.type === 'nested' &&
                rootCause.title === this.state.fbPath[this.state.fbPath.length - 1].title
              ) {
                console.log(`found nested fb. Cur title=${rootCause.title}`)
                // modify the obj directly
                rootCause.title = value
                // and update fbPath: (directly)
                const fbPathTemp = this.state.fbPath
                fbPathTemp[this.state.fbPath.length - 1].title = value
                this.setAllStates({ fbPath: fbPathTemp }) // even though we did modify it directly...
              }
            })
          })
        })
      }
    }

    const breadcrumbFragment = this.state.fbPath.map((path, index, arr) => {
      const icon = index === -1 ? <HomeIcon /> : null // disabled for now
      if (index < arr.length - 1) {
        return (
          <Link
            underline='hover'
            component='button'
            key={`br_${index}_${path.title}`}
            onClick={(event) => {
              event.preventDefault()
              handleBreadcrumbClick(index)
            }}
            color='textPrimary'
          >
            {icon}
            {path.title}
          </Link>
        )
      } else {
        console.log(`breadcrumbFragment(${this.state.title}) path.title =${path.title}}`)
        return (
          <OnBlurInputBase
            value={path.title}
            key={`br_${index}_${path.title}`}
            name='title'
            onChange={(event) => handleChangeTitle(event.target.value)}
          />
        )
      }
    })

    const handleClick = (event) => {
      event.preventDefault()
      this.setState({ anchorEl: event.currentTarget })
    }

    const handleClose = () => {
      this.setState({ anchorEl: null })
    }

    const currentFBAFileVersion = '0.7' // todo read from central file shared with extension

    const handleFileOpenEvent = (e) => {
      console.log(`input.onChange... ${e.target.files.length}`, e.target.files)
      if (e.target.files.length > 0) {
        for (const file of e.target.files) {
          console.log(`handleFileOpenEvent processing ${file.name}`, file)
          try {
            file.text().then((text) => {
              try {
                // todo use getFBDataFromText()... !
                const yamlObj = yaml.load(text, { schema: yaml.JSON_SCHEMA, filename: file.name })
                //console.log(`handleFileOpenEvent processing ${file.name} got yamlObj:'${JSON.stringify(yamlObj)}'`)
                if (typeof yamlObj !== 'object') {
                  console.error('Could not get document as yaml. Content is not valid yamlObj ' + JSON.stringify(yamlObj))
                } else {
                  // as we dont store on data file format migration (e.g. v0.3 -> v0.4) instantly
                  // (to avoid a misleading "dirty file directly after opening" and non-working 'undo')
                  // we notice the version mismatch here again, migrate again and use that data:
                  if (yamlObj.version && yamlObj.version !== currentFBAFileVersion) {
                    console.warn(
                      `handleFileOpenEvent has unexpected version ${yamlObj.version}, expected ${currentFBAFileVersion}. Todo needs migration!`,
                    )
                  }
                  const newFbPath = this.matchingFbPath(this.state.fbPath, yamlObj.fishbone, yamlObj.title)
                  this.setState({
                    // no fbaFsAuthority here?
                    data: yamlObj.fishbone,
                    title: yamlObj.title,
                    attributes: yamlObj.attributes,
                    fbPath: newFbPath,
                    clipboard: this.state?.clipboard !== undefined && !this.state.clipboard.doCut ? this.state.clipboard : undefined,
                  })
                }
              } catch (e) {
                console.error(`handleFileOpenEvent processing yaml from ${file.name} got error:'${e}'`)
              }
            })
          } catch (e) {
            console.error(`handleFileOpenEvent processing ${file.name} got error:'${e}'`)
          }
        }
      }
    }

    // alignItems = vertical alignment
    // justify = horiz.
    return (
      <AttributesContext.Provider value={this.state.attributes || []}>
        <div className='App'>
          <StyledEngineProvider injectFirst>
            <ThemeProvider theme={theme}>
              <AppBar position='static' color='transparent'>
                <Toolbar variant='dense'>
                  <div style={{ flexGrow: 1 }}></div>
                  <Breadcrumbs>{breadcrumbFragment}</Breadcrumbs>
                  <div style={{ flexGrow: 1 }}></div>
                  {this.props.vscode.isStandaloneApi && (
                    <>
                      <input
                        color='primary'
                        accept='application/yaml'
                        type='file'
                        onChange={handleFileOpenEvent}
                        id='icon-button-file'
                        style={{ display: 'none' }}
                      />
                      <label htmlFor='icon-button-file'>
                        <IconButton variant='contained' component='span' size='small' color='primary'>
                          <FileOpenIcon />
                        </IconButton>
                      </label>
                    </>
                  )}
                  <IconButton size='small' edge='end' color='primary' onClick={handleClick}>
                    <MoreHorizIcon />
                  </IconButton>
                  <Menu
                    id='appMoreMenu'
                    anchorEl={this.state.anchorEl}
                    keepMounted
                    open={Boolean(this.state.anchorEl)}
                    onClose={handleClose}
                  >
                    <MenuItem
                      onClick={() => {
                        handleClose()
                        this.onResetAllEntries(false)
                      }}
                    >
                      reset all entries
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        handleClose()
                        this.onResetAllEntries(true)
                      }}
                    >
                      reset & reimport all entries
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        handleClose()
                        this.onShowSummary()
                      }}
                    >
                      show summary
                    </MenuItem>
                    {this.state?.attributes?.findIndex((attr) => attr.hasOwnProperty('lifecycles')) < 0 && (
                      <MenuItem
                        onClick={() => {
                          handleClose()
                          this.onAddDLTAttributes()
                        }}
                      >
                        add DLT attributes
                      </MenuItem>
                    )}
                  </Menu>
                </Toolbar>
              </AppBar>
              <SummaryDialog
                label='Summary'
                fbdata={this.state.data}
                onFbPathChange={onFbPathChange}
                title={this.state.title}
                open={this.state.showSummaryDialog === true}
                onClose={() => this.setState({ showSummaryDialog: false })}
              />
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Paper>
                    <div>
                      <Grid container spacing={2} justifyContent='center'>
                        <Grid item gutterBottom></Grid>
                      </Grid>
                    </div>
                    <FishboneChart
                      fbaFsAuthority={this.state.fbaFsAuthority}
                      onStateChange={(fbData) => this.handleFBStateChange(fbData)}
                      reactInlineElementsAdder={this.addInlineElements}
                      onChange={this.handleInputChange.bind(this)}
                      effectContextMenu={[
                        { text: 'add category', cb: this.onAddCategory.bind(this) },
                        { text: 'add effect', cb: this.onAddEffect.bind(this) },
                        this.state.clipboard !== undefined && this.state.clipboard.type === 'category'
                          ? { text: 'paste', cb: this.onPaste.bind(this) }
                          : undefined,
                        { text: 'delete effect', cb: this.onDeleteEffect.bind(this) },
                      ]}
                      categoryContextMenu={[
                        { text: 'add root-cause', cb: this.onAddRootCause.bind(this, 'FBACheckbox') },
                        { text: 'add nested fishbone', cb: this.onAddRootCause.bind(this, 'nested') },
                        { text: 'import fishbone', cb: this.onAddRootCause.bind(this, 'import') },
                        { text: 'add category', cb: this.onAddCategory.bind(this) },
                        { text: 'copy', cb: this.onCopy.bind(this, false, 'category') },
                        { text: 'cut', cb: this.onCopy.bind(this, true, 'category') },
                        this.state.clipboard !== undefined /* we allow all types (currently rootcause and category */
                          ? { text: 'paste', cb: this.onPaste.bind(this) }
                          : undefined,
                        { text: 'delete category', cb: this.onDeleteCategory.bind(this) },
                      ]}
                      rootCauseContextMenu={[
                        { text: 'copy', cb: this.onCopy.bind(this, false, 'rootcause') },
                        { text: 'cut', cb: this.onCopy.bind(this, true, 'rootcause') },
                        this.state.clipboard !== undefined && this.state.clipboard.type === 'rootcause'
                          ? { text: 'paste', cb: this.onPaste.bind(this) }
                          : undefined,
                        { text: 'delete root-cause', cb: this.onDeleteRootCause.bind(this) },
                      ]}
                      data={this.getCurData(this.state.fbPath, this.state.data)}
                      effectIndex={this.state.fbPath[this.state.fbPath.length - 1].effectIndex}
                      cols='12'
                    />
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  {attributeSection}
                </Grid>
              </Grid>
            </ThemeProvider>
          </StyledEngineProvider>
        </div>
      </AttributesContext.Provider>
    )
  }

  timeZoneOffsetInMs = new Date().getTimezoneOffset() * 60 * 1000

  getUIForAttribute(attribute) {
    // we expect as attribute an Object with one key (the name) and the fbUid
    // then the key value can be a string or an object with value, type,...
    // let fbUid = attribute.fbUid
    const attrName = Object.keys(attribute).find((key) => key !== 'fbUid')
    console.log(`getUIForAttribute #keys=${Object.keys(attribute)} attr[0]=${attrName}`)
    const attrObj = attribute[attrName]
    let attrValue = ''
    let type = 'text'
    let label = attrName

    let useSelect = undefined
    let multiple = undefined

    if (typeof attrObj === 'object') {
      if (attrObj !== null) {
        attrValue = attrObj?.value
        if ('type' in attrObj) {
          type = attrObj.type
        }
        if ('label' in attrObj) {
          label = attrObj.label
        }
        if ('multiple' in attrObj) {
          multiple = attrObj.multiple
        }
        // dataProvider?
        if (attrObj.dataProvider) {
          useSelect = true
        }
      } else {
        attrValue = undefined
      }
    } else {
      attrValue = attrObj // assert string
    }

    // if type == datetime-local we do need to convert the values:
    if (type === 'datetime-local' && attrValue?.length > 0) {
      const tempVal = new Date(attrValue)
      const date = new Date(tempVal.valueOf() - this.timeZoneOffsetInMs)
      attrValue = date.toISOString().slice(0, 19)
    }

    if (useSelect !== undefined) {
      return (
        <Grid item>
          <InputDataProvided
            id={`attribute_${attrName}`}
            multiple={multiple}
            dataProvider={attrObj.dataProvider}
            attributes={this.state.attributes}
            label={label}
            value={attrValue}
            onChange={this.handleInputChange.bind(this, attribute)}
          />
        </Grid>
      )
    } else {
      return (
        <Grid item>
          <TextField
            id={`attribute_${attrName}`}
            label={label}
            type={type}
            value={attrValue}
            variant='outlined'
            size='small'
            InputLabelProps={{ shrink: true }}
            onChange={this.handleInputChange.bind(this, attribute)}
          ></TextField>
        </Grid>
      )
    }
  }
}
