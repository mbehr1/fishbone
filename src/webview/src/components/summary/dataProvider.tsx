// TODOs:
// - default expand all groups

import React from 'react'

import Select from '@mui/material/Select'
import Chip from '@mui/material/Chip'

import ErrorIcon from '@mui/icons-material/Error'
import CheckBoxIcon from '@mui/icons-material/CheckBox'
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank'

import { GetMarkdownActive, GetTextValue, RenderConditionText } from '../utils/markdown'
import { CreateTooltip, CreateLink } from './htmlHelper'
import { AggregationFn, ColumnDef } from '@tanstack/table-core'

const statusAggregationFn: AggregationFn<any> = (columnId, leafRows) => {
  var openCount = 0,
    okCount = 0,
    errorCount = 0

  leafRows.forEach((row) => {
    const value = row.getValue<string>(columnId)
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
          console.log(`Invalid status type ${value}`)
      }
    }
  })

  return [openCount, okCount, errorCount]
}

export function SummaryHeaderProvider(): ColumnDef<any>[] {
  return React.useMemo(
    () => [
      {
        header: 'Name',
        columns: [
          {
            header: 'Effect',
            accessorKey: 'effect',
            cell: (props) => props.getValue(),
            filterFn: 'customFilter',
            getGroupingValue: (row) => {
              const value = row.effect
              return typeof value === 'string' ? value : value?.key || ''
            },
            aggregate: true,
            aggregationFn: 'count',
            aggregatedCell: ({ getValue }) => {
              const value = getValue()
              return value === 1 ? `${value} effect` : `${value} effects`
            },
          },
          {
            header: 'Category',
            accessorKey: 'category',
            cell: (props) => props.getValue(),
            filterFn: 'customFilter',
            getGroupingValue: (row) => {
              const value = row.category
              return typeof value === 'string' ? value : value?.key || ''
            },
            aggregationFn: 'count',
            aggregatedCell: ({ getValue }) => {
              const value = getValue()
              return value === 1 ? `${value} category` : `${value} categories`
            },
          },
          {
            header: 'Root Cause',
            accessorKey: 'rc',
            cell: (props) => props.getValue(),
            filterFn: 'customFilter',
            enableGrouping: false,
            aggregationFn: 'count',
            aggregatedCell: ({ getValue }) => {
              const value = getValue()
              return value === 1 ? `${value} root-cause` : `${value} root-causes`
            },
          },
        ],
      },
      {
        header: 'Properties',
        columns: [
          {
            header: 'Status',
            accessorKey: 'value',
            cell: (props) => props.getValue(),
            meta: {
              filterVariant: 'select',
            },
            filterFn: 'customFilter',
            aggregationFn: statusAggregationFn,
            aggregatedCell: ({ getValue }) => {
              const value = getValue<[number, number, number]>()
              return (
                <React.Fragment>
                  <Chip size='small' icon={<CheckBoxOutlineBlankIcon />} color='primary' label={value[0]} variant='outlined' />
                  <Chip size='small' icon={<CheckBoxIcon />} color='primary' label={value[1]} variant='outlined' />
                  <Chip size='small' icon={<ErrorIcon />} color='secondary' label={value[2]} variant='outlined' />
                </React.Fragment>
              )
            },
            getGroupingValue: (row) => {
              const value = row.value
              if (value === 'error') {
                return 'errors'
              }
              if (value === 'open') {
                return 'open'
              }
              return 'ok'
            },
          },
          {
            header: 'Background',
            accessorKey: 'background',
            cell: (props) => props.getValue(),
            filterFn: 'customFilter',
            enableGrouping: false,
          },
          {
            header: 'Instructions',
            accessorKey: 'instructions',
            cell: (props) => props.getValue(),
            filterFn: 'customFilter',
            enableGrouping: false,
          },
          {
            header: 'Comments',
            accessorKey: 'comments',
            cell: (props) => props.getValue(),
            filterFn: 'customFilter',
            enableGrouping: false,
          },
        ],
      },
    ],
    [],
  )
}

export function SummaryDataProvider(
  rawData: any,
  currentTitle: string | undefined,
  onFbPathChange: (arg0: any) => void,
  onClose: () => void,
) {
  const FbPathLinkClicked = (path: any) => {
    if (onFbPathChange && onClose) {
      onFbPathChange(path)
      onClose()
    }
  }

  const hooks = { FbPathLinkClicked: FbPathLinkClicked }

  return CreateTableData(rawData, hooks, currentTitle)
}

type PathItem = {
  title: string
  effectIndex: number
}

function CreateTableData(rawData: any[], hooks: { FbPathLinkClicked: any }, currentTitle = '', path: PathItem[] = []) {
  var tableData: any[] = []

  var effectIndex = 0

  rawData.forEach((effect) => {
    path.push({ title: currentTitle, effectIndex: effectIndex })
    effectIndex++

    effect.categories.forEach((category: { rootCauses: any[]; name: string }) => {
      category.rootCauses.forEach((rc) => {
        if (typeof rc === 'object') {
          if ('props' in rc) {
            const props = rc.props
            var pathString = ''
            var levelString = path.length > 1 ? 'L' + String(path.length - 1) + ': ' + effect.name : effect.name

            path.forEach(function (e, idx, array) {
              pathString += e.title
              if (idx < array.length - 1) {
                pathString += ' -> '
              }
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
