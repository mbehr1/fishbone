// copyright (c) 2020 - 2023, Matthias Behr
import React, { useEffect, useContext } from 'react'
import PropTypes from 'prop-types'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import { Button, DialogContent, DialogTitle, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemIcon from '@mui/material/ListItemIcon'
import FilterListIcon from '@mui/icons-material/FilterList'
import Checkbox from '@mui/material/Checkbox'
import Badge from '@mui/material/Badge'
import { makeStyles } from '@mui/styles'

import { AttributesContext } from './../App'
import { triggerRestQueryDetails, objectShallowEq, numberAbbrev } from './../util'

var stableStringify = require('json-stable-stringify')

/* todos
- add manual trigger button for preview (or find better way to avoid reports constantly popping up)
  - applyMode -> manual trigger only
- uri escape filter strings (to avoid problems with &,",...)
- cache apply query rests (e.g. only on button press)
- add way for reports to contain multiple filter
- add hover/tooltip for filters showing the full object (e.g. tmpFb...)
- add manual filter entry
- finish support apply mode
- disallow esc to close?
- add icons for report,... similar to tree-view in dlt-logs
*/

const useStyles = makeStyles((theme) => ({
  item: {
    padding: 0,
  },
  icon: {
    'min-width': '24px',
  },
  checkbox: {
    padding: 0,
  },
  text: {
    margin: 0,
  },
}))

function not(a, b) {
  return a.filter((value) => b.indexOf(value) === -1)
}

function intersection(a, b) {
  return a.filter((value) => b.indexOf(value) !== -1)
}

export const MSTP_strs = ['log', 'app_trace', 'nw_trace', 'control', '', '', '', '']
export const MTIN_LOG_strs = ['', 'fatal', 'error', 'warn', 'info', 'debug', 'verbose', '', '', '', '', '', '', '', '', '']

/**
 * return a name similar as in DltFilter.ts from mbehr1/dlt-logs
 * @param {Object} filter
 */
function nameForFilterObj(filter) {
  let enabled = ''
  if (filter.name) {
    enabled += filter.name + ' '
  }
  let type
  switch (filter.type) {
    case 0 /* DltFilterType.POSITIVE*/:
      type = '+'
      break
    case 1 /* DltFilterType.NEGATIVE*/:
      type = '-'
      break
    case 2 /* DltFilterType.MARKER*/:
      type = '*'
      break
    case 3 /* DltFilterType.EVENT*/:
      type = '@'
      break
    default:
      type = `unknown(${filter.type})`
      break
  }
  if (filter.negateMatch) {
    type += '!'
  }
  let nameStr = ''
  if (filter.mstp !== undefined) {
    nameStr += MSTP_strs[filter.mstp]
    nameStr += ' '
  }
  if (filter.logLevelMin) {
    // we ignore 0 values here
    nameStr += `>=${MTIN_LOG_strs[filter.logLevelMin]} `
  }
  if (filter.logLevelMax) {
    // we ignore 0 value here
    nameStr += `<=${MTIN_LOG_strs[filter.logLevelMax]} `
  }
  if (filter.ecu) {
    nameStr += `ECU:${filter.ecu} `
  } // we ignore empty strings
  if (filter.apid) {
    nameStr += `APID:${filter.apid} `
  }
  if (filter.ctid) {
    nameStr += `CTID:${filter.ctid} `
  }
  if (filter.payload) {
    nameStr += `payload contains '${filter.payload}' `
  }
  if (filter.payloadRegex !== undefined) {
    nameStr += `payload matches '${filter.payloadRegex}'`
  }
  if (filter.lifecycles !== undefined) {
    nameStr += ` in sel. LCs`
  }

  return `${enabled}${type}${nameStr}`
}

class RestCommandBase {
  get asRestCommand() {
    throw new Error(`logical error! RestCommandBase asRestCommand() used`)
  }
  get asJson() {
    throw new Error(`logical error! RestCommandBase asRestCommand() used`)
  }
}

/**
 * RestCommandFilter used for query and apply mode.
 * Gets constructed with an object directly representing a
 * DLT filter.
 */
class RestCommandFilter extends RestCommandBase {
  constructor(filter) {
    super()
    this.name = nameForFilterObj(filter)
    this.json = stableStringify(filter) //  JSON.stringify(filter, Object.keys(filter).sort());
  }

  get asJson() {
    return this.json
  }
  get asRestCommand() {
    return `add=${encodeURIComponent(this.json)}`
  }
}

/**
 * used for regular command=params commands
 */
class RestCommandApply extends RestCommandBase {
  constructor(command, commandParams, name) {
    super()
    this.command = command
    this.params = commandParams
    this.name = name ? name : this.command
  }
  get asRestCommand() {
    return `${this.command}=${encodeURIComponent(this.params)}`
  }
}

/**
 * used for report=[filters] commands
 * @param filters array of filter objs
 */
class RestCommandReport extends RestCommandBase {
  constructor(filters) {
    super()
    this.filters = filters.map((f) => new RestCommandFilter(f))
  }

  appendFilterObj(filterObj) {
    this.filters.push(new RestCommandFilter(filterObj))
  }

  get name() {
    return `report with ${this.filters.length} filters:` + this.filters.map((f) => f.name).join(', ')
  }

  get asRestCommand() {
    return `report=${encodeURIComponent(`[${this.filters.map((f) => f.asJson).join(',')}]`)}`
  }
}

function parseFilters(request, applyMode) {
  if (!applyMode) {
    // parse a request string expecting the form:
    // ext:mbehr1.dlt-logs/get/.../filters?query=[] ([] is already uriencoded)
    const indexOfQ = request?.indexOf('?query=') // the new uri encoded start with %5B the old ones with [
    const queryFilters = []
    if (indexOfQ > 0) {
      const queryArray = decodeURIComponent(request.slice(indexOfQ + 7))
      try {
        const qArrObj = JSON.parse(queryArray)
        console.log(`parseFilters got from '${queryArray}:'`, qArrObj)
        if (Array.isArray(qArrObj)) {
          qArrObj.forEach((arrObj) => {
            const newFilter = new RestCommandFilter(arrObj)
            queryFilters.push(newFilter)
          })
        }
      } catch (e) {
        console.warn(`parseFilters parsing '${queryArray}' got e=${e}`)
      }
    }
    return queryFilters
  } else {
    const commandList = []
    // parse all params into sep. "filter commands like":
    // /get/...filters?delete={}&enableAll=view&add={}&add={}... // all params like {} are uriencoded
    const indexOfQ = request?.indexOf('?')
    if (indexOfQ > 0) {
      const options = request.slice(indexOfQ + 1)
      const optionArr = options.split('&')
      for (const commandStr of optionArr) {
        const eqIdx = commandStr.indexOf('=')
        const command = commandStr.slice(0, eqIdx)
        const commandParams = decodeURIComponent(commandStr.slice(eqIdx + 1))
        switch (command) {
          case 'enableAll':
          case 'disableAll':
            commandList.push(new RestCommandApply(command, commandParams, commandStr))
            break
          case 'add':
            commandList.push(new RestCommandFilter(JSON.parse(commandParams))) // we use RestCommandFilter here to allow direct compare with loaded filters
            break
          case 'delete':
            commandList.push(new RestCommandApply(command, commandParams, `delete=${commandParams}`))
            break
          case 'patch':
            commandList.push(new RestCommandApply(command, commandParams, `patch=${commandParams}`))
            break
          case 'report':
            const params = JSON.parse(commandParams)
            commandList.push(new RestCommandReport(params))
            break
          default:
            commandList.push(new RestCommandApply(command, commandParams, `unknown '${command}'`)) // { name: `unknown '${command}'`, restCommand: command, value: commandParams });
            break
        }
      }
    }
    return commandList
  }
}

/**
 * open a modal dialog to define DLT filter settings
 * @param {*} props (open, onChange, onClose, applyMode)
 */
export default function DLTFilterAssistantDialog(props) {
  console.log(`DLTFilterAssistantDialog(open=${props.open}, applyMode=${props.applyMode})`)

  const attributes = useContext(AttributesContext)

  const classes = useStyles()

  const [dataSource, setDataSource] = React.useState(props.dataSource)

  const [filters, setFilters] = React.useState([])

  const [checked, setChecked] = React.useState([])
  const [left, setLeft] = React.useState()
  const [right, setRight] = React.useState()

  // preview all available filters with the list from opened dlt doc:
  const [loadAllFilters, setLoadAllFilters] = React.useState(-1)

  useEffect(() => {
    console.log(`DLTFilterAssistantDialog useEffect[props.dataSource, props.applyMode]`)
    setDataSource(props.dataSource)
    // parse filters:
    const parsedFilters = parseFilters(props.dataSource, props.applyMode)

    // add special filters if not in parsedFilters
    // applyMode delete={"tmpFb":1}
    // disableAll=view
    // ${attributes.findIndex(attr => attr.hasOwnProperty('lifecycles')) >= 0 ? `add={"name":"not selected lifecycles","tmpFb":1, "type":1,"not":true,"lifecycles":"${attributes.lifecycles.id}"}
    let forRight = 0
    if (props.applyMode) {
      // todo this should on move to left always be at the top
      const newFilter = new RestCommandApply('delete', '{"tmpFb":1}', `delete={"tmpFb":1}`)
      const curIdx = parsedFilters.findIndex((filter) => objectShallowEq(newFilter, filter))
      if (curIdx < 0) {
        parsedFilters.push(newFilter)
        forRight++
      }
    }
    if (props.applyMode) {
      // todo this should on move to left always be at the top
      const newFilter = new RestCommandApply('disableAll', 'view', `disableAll=view`)
      const curIdx = parsedFilters.findIndex((filter) => objectShallowEq(newFilter, filter))
      if (curIdx < 0) {
        parsedFilters.push(newFilter)
        forRight++
      }
    }
    if (true /* or add attributes here? */) {
      // eslint-disable-next-line no-template-curly-in-string
      const newAttrs = { name: 'not selected lifecycles', type: 1, not: true, lifecycles: '${attributes.lifecycles.id}' }
      const newFilter = new RestCommandFilter(props.applyMode ? { ...newAttrs, tmpFb: 1 } : newAttrs)
      const curIdx = parsedFilters.findIndex((filter) => objectShallowEq(newFilter, filter))
      if (curIdx < 0) {
        parsedFilters.push(newFilter)
        forRight++
      }
    }

    setFilters(parsedFilters)
    setLeft(parsedFilters.map((filter, index) => index).filter((val) => val < parsedFilters.length - forRight))
    setRight(parsedFilters.map((filter, index) => index).filter((val) => val >= parsedFilters.length - forRight))
    setChecked([])
    setLoadAllFilters(0)
  }, [props.dataSource, props.applyMode])
  console.log(`DLTFilterAssistantDialog dataSource=${dataSource}`)

  useEffect(() => {
    if (props.open && !loadAllFilters) {
      console.log(`DLTFilterAssistantDialog effect for filter fetch called`)
      const fetchdata = async () => {
        try {
          setLoadAllFilters(1) // running
          const res = await triggerRestQueryDetails({ source: 'ext:mbehr1.dlt-logs/get/docs/0/filters', jsonPath: '$.data[*]' }, attributes)
          if ('result' in res) {
            //console.log(`got res.result=`, res.result);
            if (Array.isArray(res.result)) {
              const newFilters = [...filters]
              const newLeft = [...left]
              const newRight = [...right]
              const newChecked = [...checked]
              res.result.forEach((filter) => {
                if (filter.type === 'filter') {
                  const attr = filter.attributes
                  if (attr.type === 0 || attr.type === 1 || (props.applyMode && attr.type === 2) || (props.applyMode && attr.type === 3)) {
                    // only pos,neg. And marker and event filters only for apply mode
                    if (!attr?.atLoadTime && !(attr?.tmpFb === 1)) {
                      // ignore load time ones and temporary ones
                      const enabled = attr?.enabled ? (attr.type !== 3 /* event filters should not be enabled */ ? true : false) : false
                      const newAttrs = { ...attr, configs: undefined, id: undefined, enabled: undefined }
                      const newFilter = new RestCommandFilter(props.applyMode ? { ...newAttrs, tmpFb: 1 } : newAttrs)
                      // does it exist already?
                      const curIdx = filters.findIndex((filter) => objectShallowEq(newFilter, filter))
                      if (curIdx < 0) {
                        newFilters.push(newFilter)
                        if (enabled) {
                          newChecked.push(newFilters.length - 1)
                        }
                        newRight.push(newFilters.length - 1)
                      }
                    }
                  }
                }
              })
              setFilters(newFilters)
              setLeft(newLeft)
              setRight(newRight)
              setChecked(newChecked)
            }
            setLoadAllFilters(2) // done
          }
        } catch (e) {
          console.warn(`DLTFilterAssistantDialog loadAllFilters effect got error:`, e)
        }
      }
      fetchdata()
    }
  }, [props.open, loadAllFilters, filters, left, right, checked, props.applyMode, attributes])

  useEffect(() => {
    const updateDataSource = (list) => {
      if (props.open && dataSource !== undefined) {
        //console.log(`updateDataSource(dataSource=${dataSource} list.length=${list.length}`);
        const indexOfQ = dataSource?.indexOf('?')
        const uri = indexOfQ > 0 ? dataSource.slice(0, indexOfQ) : dataSource
        if (props.applyMode) {
          let commands = list.map((idx) => filters[idx].asRestCommand).join('&')
          const newDataSource = uri + `?${commands}`
          if (newDataSource !== dataSource) {
            console.log(`updateDataSource setDataSource(${newDataSource}`)
            setDataSource(newDataSource)
            setPreviewQueryResult(`Press "Test apply filter" button to start...`)
            setPreviewBadgeStatus(3)
          }
        } else {
          // !applyMode -> queryMode
          // calc params newly based on left ones:
          // list should only contain RestCommandFilter
          let params = list.map((idx) => filters[idx].asJson).join(',')
          const newDataSource = uri + `?query=${encodeURIComponent(`[${params}]`)}`
          if (newDataSource !== dataSource) {
            console.log(`updateDataSource setDataSource(${newDataSource}`)
            setDataSource(newDataSource)
            setPreviewBadgeStatus(0)
          }
        }
      }
    }
    if (Array.isArray(left)) {
      updateDataSource(left)
    }
  }, [props.open, left, dataSource, filters, props.applyMode])

  // preview badge content
  const [previewBadgeContent, setPreviewBadgeContent] = React.useState()
  const [previewBadgeStatus, setPreviewBadgeStatus] = React.useState(props.applyMode ? 3 : 0) // 0 = please load, 1 = loading, 2 = done, 3 = wait manual
  const [previewBadgeError, setPreviewBadgeError] = React.useState('')
  const [previewQueryResult, setPreviewQueryResult] = React.useState('')

  useEffect(() => {
    if (props.open && !previewBadgeStatus && dataSource?.length > 0) {
      console.log(
        `DLTFilterAssistantDialog effect for badge processing called (badgeStatus=${previewBadgeStatus}, dataSource=${dataSource})`,
      )
      const fetchdata = async () => {
        try {
          setPreviewBadgeError('querying...')
          setPreviewBadgeStatus(1)
          const res = await triggerRestQueryDetails({ source: dataSource, jsonPath: '$.data[*]', conv: 'length:' }, attributes)
          if ('error' in res) {
            setPreviewBadgeError(res.error)
          } else {
            setPreviewBadgeError('')
          }
          let details = ''
          if ('jsonPathResult' in res) {
            details += 'jsonPath results:\n' + JSON.stringify(res.jsonPathResult, null, 2)
          }
          if ('restQueryResult' in res) {
            details += '\nrestQuery results:\n' + JSON.stringify(res.restQueryResult, null, 2)
          }
          setPreviewQueryResult(details)
          if ('result' in res) {
            setPreviewBadgeContent(JSON.stringify(res.result).slice(0, 20))
            setPreviewBadgeStatus(2)
          }
        } catch (e) {
          console.warn(`DLTFilterAssistantDialog effect got error:`, e)
          setPreviewBadgeError(e && e.errors && Array.isArray(e.errors) ? e.errors.join(' / ') : `unknown error:'${JSON.stringify(e)}'`)
          setPreviewQueryResult('')
        }
      }
      fetchdata()
    }
  }, [props.open, previewBadgeStatus, dataSource, previewBadgeError, attributes])

  const handleClose = () => {
    props.onClose()
  }

  const handleSave = () => {
    console.log(`DLTFilterAssistantDialog handleSave()`)
    console.log(` dataSource=${dataSource}`)

    // if one differs from props.data call props.onChange
    if (dataSource !== props.dataSource) {
      props.onChange(dataSource)
    }
    props.onClose()
  }

  const handleToggle = (value) => () => {
    const currentIndex = checked.indexOf(value)
    const newChecked = [...checked]

    if (currentIndex === -1) {
      newChecked.push(value)
    } else {
      newChecked.splice(currentIndex, 1)
    }
    setChecked(newChecked)
  }

  const customList = (items) => (
    <Paper style={{ width: 400, height: 350, overflow: 'auto' }}>
      <List dense={true} disablePadding={true} component='div' role='list'>
        {items.map((value) => {
          const labelId = `transfer-list-item-${value}-label`

          return (
            <ListItem
              classes={{ root: classes.item }}
              key={value}
              role='listitem'
              button
              onClick={handleToggle(value)}
              dense={true}
              disableGutters={true}
            >
              <ListItemIcon classes={{ root: classes.icon }}>
                <Checkbox
                  color='primary'
                  classes={{ root: classes.checkbox }}
                  checked={checked.indexOf(value) !== -1}
                  tabIndex={-1}
                  disableRipple
                  size='small'
                  inputProps={{ 'aria-labelledby': labelId }}
                />
              </ListItemIcon>
              <ListItemText classes={{ root: classes.text }} id={labelId} primary={`${filters[value]?.name}`} />
            </ListItem>
          )
        })}
        <ListItem />
      </List>
    </Paper>
  )

  const leftChecked = Array.isArray(left) ? intersection(checked, left) : []
  const rightChecked = Array.isArray(right) ? intersection(checked, right) : []

  const handleCheckedRight = () => {
    setRight(right.concat(leftChecked))
    setLeft(not(left, leftChecked))
    setChecked(not(checked, leftChecked))
  }

  const handleCheckedLeft = () => {
    if (props.applyMode) {
      // special handling for report filters:
      // a) convert a regular event filter into a report with that filter
      // b) convert multiple event filter in a row into *one* report with those filters
      // iterate over all rightChecked ones:
      // rightChecked is an array of idxs:
      const newRightChecked = [...rightChecked]
      let newReport = undefined
      const newLeft = [...left]
      const newFilters = [...filters]
      for (let i = 0; i < newRightChecked.length; ++i) {
        const idx = newRightChecked[i]
        const filter = newFilters[idx]
        let wasReport = false
        if (filter instanceof RestCommandFilter) {
          const filterObj = JSON.parse(filter.asJson)
          if (filterObj.type === 3) {
            // got a report filter:
            wasReport = true
            // create a new filter and add to left:
            if (!newReport) {
              newReport = new RestCommandReport([filterObj])
              newFilters.push(newReport)
              newLeft.push(newFilters.length - 1)
            } else {
              // add to newReport
              newReport.appendFilterObj(filterObj)
            }
            // uncheck the right one, but keep it in right
            newRightChecked.splice(i, 1)
            --i
          }
        }
        if (!wasReport && newReport) {
          newReport = undefined
        }
      }
      setLeft(newLeft.concat(newRightChecked))
      setRight(not(right, newRightChecked))
      setChecked(not(checked, rightChecked)) // here we uncheck the prev. reports
      if (newFilters.length !== filters.length) {
        setFilters(newFilters)
      }
    } else {
      setLeft(left.concat(rightChecked))
      setRight(not(right, rightChecked))
      setChecked(not(checked, rightChecked))
    }
  }

  //console.log(`DltFilterAssistant render() filters.length=`, filters.length);
  //console.log(`DltFilterAssistant render() checked=`, checked);
  //console.log(`DltFilterAssistant render() left   =`, left);
  //console.log(`DltFilterAssistant render() right  =`, right);

  return (
    <Dialog fullScreen open={props.open} onClose={handleClose}>
      <DialogTitle id='dltFilterAssistantDialogTitle'>
        DLT filter assistant...
        <IconButton onClick={handleClose} color='inherit' style={{ position: 'absolute', right: 1 }} size='large'>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container direction='column' justifyContent='flex-start' alignItems='stretch' spacing={2}>
          <Grid item>
            <Grid container spacing={2} justifyContent='flex-start' alignItems='center'>
              <Grid item>
                Selected filters:
                {Array.isArray(left) && customList(left)}
              </Grid>
              <Grid item>
                <Grid container direction='column' alignItems='center'>
                  <Button size='small' color='primary' onClick={handleCheckedRight} disabled={leftChecked.length === 0}>
                    &gt;
                  </Button>
                  <Button size='small' color='primary' onClick={handleCheckedLeft} disabled={rightChecked.length === 0}>
                    &lt;
                  </Button>
                </Grid>
              </Grid>
              <Grid item>
                All available filters:
                {Array.isArray(right) && customList(right)}
              </Grid>
            </Grid>
          </Grid>
          {props.applyMode && (
            <Grid item>
              <Button
                id={'test-apply-filter-' + props.name}
                color='secondary'
                startIcon={<FilterListIcon />}
                disabled={!(previewBadgeStatus === 3 && dataSource?.length > 0)}
                onClick={(e) => {
                  if (previewBadgeStatus === 3 && dataSource?.length > 0) {
                    setPreviewBadgeStatus(0)
                  }
                }}
              >
                Test "apply filter"
              </Button>
            </Grid>
          )}
          <Grid item>
            source:
            <React.Fragment>
              {dataSource
                ? dataSource.split('&').map((fra, index) => (
                    <React.Fragment>
                      <br />
                      {index > 0 ? <React.Fragment>&emsp;</React.Fragment> : null}
                      {index > 0 ? '&' + decodeURIComponent(fra) : decodeURIComponent(fra)}
                    </React.Fragment>
                  ))
                : ''}
            </React.Fragment>
          </Grid>
          <Grid item>
            <Paper>
              {!props.applyMode && (
                <Badge
                  badgeContent={numberAbbrev(previewBadgeContent, 999)}
                  color='error'
                  anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
                  overlap='circular'
                  max={NaN}
                >
                  badge content='{JSON.stringify(previewBadgeContent)}'
                </Badge>
              )}
              <div>
                badge error='{JSON.stringify(previewBadgeError)}' badge status='{JSON.stringify(previewBadgeStatus)}'
              </div>
              <div>
                <pre style={{ display: 'block' }}>{previewQueryResult}</pre>
              </div>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button size='small' autoFocus onClick={handleSave} color='primary'>
          Save changes
        </Button>
      </DialogActions>
    </Dialog>
  )
}

DLTFilterAssistantDialog.propTypes = {
  dataSource: PropTypes.string.isRequired,
  open: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired, // otherwise the option won't be stored
  onClose: PropTypes.func.isRequired,
  applyMode: PropTypes.bool, // default to false
}
