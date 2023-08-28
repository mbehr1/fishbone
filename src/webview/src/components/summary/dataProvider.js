import React from 'react'

import Select from '@mui/material/Select'
import Chip from '@mui/material/Chip'

import ErrorIcon from '@mui/icons-material/Error'
import CheckBoxIcon from '@mui/icons-material/CheckBox'
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank'

import { GetMarkdownActive, GetTextValue, RenderConditionText } from './../utils/markdown'
import { CreateTooltip, CreateLink } from './htmlHelper'

// This is a custom filter UI for selecting
// a unique option from a list
function SelectColumnFilter({ column: { filterValue, setFilter, preFilteredRows, id } }) {
  // Calculate the options for filtering
  // using the preFilteredRows
  const options = React.useMemo(() => {
    const options = new Set()
    preFilteredRows.forEach((row) => {
      options.add(row.values[id])
    })
    return [...options.values()]
  }, [id, preFilteredRows])

  // Render a multi-select box
  return (
    <Select
      native
      style={{ paddingHorizontal: '2px' }}
      value={filterValue}
      onChange={(e) => {
        setFilter(e.target.value || undefined)
      }}
      inputProps={{
        id: 'select-filter-input',
      }}
    >
      <option value=''>&nbsp;All</option>
      {options.map((option, i) => (
        <option key={i} value={option}>
          &nbsp;{option}
        </option>
      ))}
    </Select>
  )
}

function getStatusAggregator(values) {
  var openCount = 0,
    okCount = 0,
    errorCount = 0

  values.forEach((value) => {
    if (typeof value === 'string') {
      switch (value) {
        case 'open':
          openCount++
          break
        case 'ok':
          okCount++
          break
        case 'error':
          errorCount++
          break
        default:
          console.log(`getStatusAggregator: Invalid status type ${value}`)
      }
    }
  })

  return [openCount, okCount, errorCount]
}

export function SummaryHeaderProvider() {
  return React.useMemo(
    () => [
      {
        Header: 'Name',
        columns: [
          {
            Header: 'Effect',
            accessor: 'effect',
            filter: 'customFilter',
            aggregate: 'count',
            Aggregated: ({ value }) => {
              return value === 1 ? `${value} effect` : `${value} effects`
            },
          },
          {
            Header: 'Category',
            accessor: 'category',
            filter: 'customFilter',
            aggregate: 'count',
            Aggregated: ({ value }) => {
              return value === 1 ? `${value} category` : `${value} categories`
            },
          },
          {
            Header: 'Root Cause',
            accessor: 'rc',
            filter: 'customFilter',
            disableGroupBy: true,
            aggregate: 'count',
            Aggregated: ({ value }) => {
              return value === 1 ? `${value} root-cause` : `${value} root-causes`
            },
          },
        ],
      },
      {
        Header: 'Properties',
        columns: [
          {
            Header: 'Status',
            accessor: 'value',
            Filter: SelectColumnFilter,
            filter: 'includes',
            aggregate: getStatusAggregator,
            Aggregated: ({ value }) => {
              return (
                <React.Fragment>
                  <Chip size='small' icon={<CheckBoxOutlineBlankIcon />} color='primary' label={value[0]} variant='outlined' />
                  <Chip size='small' icon={<CheckBoxIcon />} color='primary' label={value[1]} variant='outlined' />
                  <Chip size='small' icon={<ErrorIcon />} color='secondary' label={value[2]} variant='outlined' />
                </React.Fragment>
              )
            },
          },
          {
            Header: 'Background',
            accessor: 'background',
            filter: 'customFilter',
            disableGroupBy: true,
          },
          {
            Header: 'Instructions',
            accessor: 'instructions',
            filter: 'customFilter',
            disableGroupBy: true,
          },
          {
            Header: 'Comments',
            accessor: 'comments',
            filter: 'customFilter',
            disableGroupBy: true,
          },
        ],
      },
    ],
    [],
  )
}

export function SummaryDataProvider(rawData, currentTitle, onFbPathChange, onClose) {
  const FbPathLinkClicked = (path) => {
    if (onFbPathChange && onClose) {
      onFbPathChange(path)
      onClose()
    }
  }

  const hooks = { FbPathLinkClicked: FbPathLinkClicked }

  return CreateTableData(rawData, hooks, currentTitle)
}

function CreateTableData(rawData, hooks, currentTitle = '', path = []) {
  var tableData = []

  var effectIndex = 0

  rawData.forEach((effect) => {
    path.push({ title: currentTitle, effectIndex: effectIndex })
    effectIndex++

    effect.categories.forEach((category) => {
      category.rootCauses.forEach((rc) => {
        if (typeof rc === 'object') {
          if ('props' in rc) {
            const props = rc.props
            var pathString = ''
            var levelString = path.length > 1 ? 'L' + String(path.length - 1) + ': ' + effect.name : effect.name

            path.forEach(function (e, idx, array) {
              pathString += e.title
              if (idx < array.length - 1) pathString += ' -> '
            })

            tableData.push({
              effect: CreateTooltip(
                pathString,
                CreateLink(levelString, hooks.FbPathLinkClicked, JSON.parse(JSON.stringify(path))),
                levelString,
              ),
              category: CreateLink(
                typeof category.name === 'string' ? category.name : '',
                hooks.FbPathLinkClicked,
                JSON.parse(JSON.stringify(path)),
              ),
              rc: CreateLink(
                props.label && typeof props.label === 'string' ? props.label : '',
                hooks.FbPathLinkClicked,
                JSON.parse(JSON.stringify(path)),
              ),
              value: props.value && typeof props.value === 'string' ? props.value : 'open',

              instructions: RenderConditionText({
                markdownActive: GetMarkdownActive(props.instructions),
                text: GetTextValue(props.instructions),
              }),
              background: RenderConditionText({
                markdownActive: GetMarkdownActive(props.backgroundDescription),
                text: GetTextValue(props.backgroundDescription),
              }),
              comments: RenderConditionText({ markdownActive: GetMarkdownActive(props.comments), text: GetTextValue(props.comments) }),
            })
          }

          if (rc.type === 'nested') {
            tableData = tableData.concat(CreateTableData(rc.data, hooks, rc.title, path))
          }
        }
      })
    })
    path.pop()
  })
  return tableData
}
