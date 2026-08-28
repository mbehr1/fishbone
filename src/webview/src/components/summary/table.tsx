import React from 'react'

import CssBaseline from '@mui/material/CssBaseline'
import IconButton from '@mui/material/IconButton'
import MaUTable from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableContainer from '@mui/material/TableContainer'
import { makeStyles } from '@mui/styles'
import InputAdornment from '@mui/material/InputAdornment'
import TextField, { TextFieldProps } from '@mui/material/TextField'
import SearchIcon from '@mui/icons-material/Search'
import ViewHeadlineIcon from '@mui/icons-material/ViewHeadline'
import ViewQuiltIcon from '@mui/icons-material/ViewQuilt'

import TableToolbar from './tableToolbar'

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  useReactTable,
  Column,
  Row,
  getFacetedUniqueValues,
  getFacetedRowModel,
  ExpandedState,
} from '@tanstack/react-table'

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends unknown, TValue = unknown> {
    filterVariant?: 'text' | 'range' | 'select'
  }
}

const useStyles = makeStyles((_theme) => ({
  root: {},
  tableCell: {
    borderWidth: '1px',
    padding: '5px',
    borderStyle: 'solid',
  },
}))

// MARK: Filter component
function Filter({ column, count }: { column: Column<TData>; count: number }) {
  const columnFilterValue = column.getFilterValue()
  const { filterVariant } = column.columnDef.meta ?? {}

  const sortedUniqueValues = React.useMemo<string[]>(
    () =>
      filterVariant !== 'select'
        ? []
        : Array.from(column.getFacetedUniqueValues().keys())
            .filter((v): v is string => typeof v === 'string')
            .sort()
            .slice(0, 5000),
    [column.getFacetedUniqueValues(), filterVariant],
  )

  return filterVariant === 'range' ? (
    <div>
      range filter nyi!
      {/* <div className='flex space-x-2'>
        <DebouncedInput
          type='number'
          value={(columnFilterValue as [number, number])?.[0] ?? ''}
          onChange={(value: any) => column.setFilterValue((old: [number, number]) => [value, old?.[1]])}
          placeholder={`Min`}
          className='w-24 border shadow rounded'
        />
        <DebouncedInput
          type='number'
          value={(columnFilterValue as [number, number])?.[1] ?? ''}
          onChange={(value: any) => column.setFilterValue((old: [number, number]) => [old?.[0], value])}
          placeholder={`Max`}
          className='w-24 border shadow rounded'
        />
      </div>
      <div className='h-1' /> */}
    </div>
  ) : filterVariant === 'select' ? (
    <select onChange={(e) => column.setFilterValue(e.target.value)} value={columnFilterValue?.toString()}>
      <option value=''>all</option>
      {sortedUniqueValues.map((value) => (
        <option value={value} key={value}>
          {value}
        </option>
      ))}
    </select>
  ) : (
    <DebouncedTextField
      onChange={(value: any) => column.setFilterValue(value)}
      placeholder={`${count} records...`}
      type='text'
      value={(columnFilterValue ?? '') as string}
    />
  )
}

function DebouncedTextField({
  value: initialValue,
  onChange,
  debounce = 500,
  ...props
}: {
  value: string | number
  onChange: (value: string | number) => void
  debounce?: number
} & Omit<TextFieldProps, 'variant'>) {
  const [value, setValue] = React.useState(initialValue)

  React.useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value)
    }, debounce)

    return () => clearTimeout(timeout)
  }, [value, onChange, debounce])

  return (
    <TextField
      {...props}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      InputProps={{
        startAdornment: (
          <InputAdornment position='start'>
            <SearchIcon />
          </InputAdornment>
        ),
      }}
    />
  )
}

// MARK: customFilterFn
function customFilterFn(row: Row<TData>, columnId: string, filterValue: any, addMeta: (meta: any) => void): boolean {
  if (!filterValue) {
    return true
  }

  const filterStr = String(filterValue).toLowerCase()
  // console.warn(`Filtering row '${row.id}' on column '${columnId}' with filter value '${filterStr}'`)

  const value = row.getValue<any>(columnId)
  if (value === null) {
    return false
  }

  if (typeof value === 'string') {
    return String(value).toLowerCase().includes(filterStr)
  } else if (typeof value === 'number') {
    return String(value).includes(filterStr)
  } else if (typeof value === 'object') {
    if (value.props && typeof value.props === 'object') {
      if (typeof value.props.children === 'string') {
        return value.props.children.toLowerCase().includes(filterStr)
      } else if (
        typeof value.props.dangerouslySetInnerHTML === 'object' &&
        typeof value.props.dangerouslySetInnerHTML.__html === 'string'
      ) {
        return value.props.dangerouslySetInnerHTML.__html.toLowerCase().includes(filterStr)
      }
    }
    if (typeof value.key === 'string') {
      return value.key.toLowerCase().includes(filterStr)
    }
  }
  return false
}

// MARK: customGlobalFilterFn
function customGlobalFilterFn(row: Row<TData>, columnId: string, filterValue: any, addMeta: (meta: any) => void): boolean {
  if (!filterValue) {
    return true
  }

  const filterStr = String(filterValue).toLowerCase()
  // console.warn(`Filtering row '${row.id}' on column '${columnId}' with filter value '${filterStr}'`)

  // Check all cells in the row
  return row.getAllCells().some((cell) => {
    const value = cell.getValue()
    if (value === null) {
      return false
    }

    if (typeof value === 'string') {
      return String(value).toLowerCase().includes(filterStr)
    } else if (typeof value === 'number') {
      return String(value).includes(filterStr)
    } else if (typeof value === 'object') {
      if ('props' in value && typeof value.props === 'object') {
        const props = value.props as { children?: any; dangerouslySetInnerHTML?: { __html?: string } }
        if (typeof props.children === 'string') {
          return props.children.toLowerCase().includes(filterStr)
        } else if (typeof props.dangerouslySetInnerHTML === 'object' && typeof props.dangerouslySetInnerHTML.__html === 'string') {
          return props.dangerouslySetInnerHTML.__html.toLowerCase().includes(filterStr)
        }
      }
      if ('key' in value && typeof value.key === 'string') {
        return value.key.toLowerCase().includes(filterStr)
      }
    }

    // console.warn(`  Checking cell in column ${cell.column.id} with value:`, value)
    return false
  })
}

// MARK: Table component
function Table({ onClose, columns, data }: { onClose: () => void; columns: any[]; data: any[] }) {
  const classes = useStyles()

  const [grouping, setGrouping] = React.useState<string[]>(['effect', 'category'])
  const [globalFilter, setGlobalFilter] = React.useState<string | undefined>('')
  const [expanded, setExpanded] = React.useState<ExpandedState>(true)

  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFacetedRowModel: getFacetedRowModel(), // client-side faceting
    getFacetedUniqueValues: getFacetedUniqueValues(), // generate unique values for select filter/autocomplete
    filterFns: {
      customFilter: customFilterFn,
    },
    globalFilterFn: customGlobalFilterFn,
    autoResetExpanded: false,
    groupedColumnMode: false,
    state: {
      grouping: grouping,
      globalFilter,
      expanded,
    },
    onGroupingChange: setGrouping,
    onGlobalFilterChange: setGlobalFilter,
    onExpandedChange: setExpanded,
  })

  return (
    <TableContainer>
      <TableToolbar
        preGlobalFilteredRows={table.getFilteredRowModel().rows /*  preGlobalFilteredRows*/}
        setGlobalFilter={table.setGlobalFilter}
        globalFilter={table.getState().globalFilter}
        onClose={onClose}
      />
      <MaUTable>
        <TableHead>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((column) => (
                <TableCell key={column.id} colSpan={column.colSpan} className={classes.tableCell}>
                  <span style={{ whiteSpace: 'nowrap' }}>
                    {flexRender(column.column.columnDef.header, column.getContext())}
                    {column.column.getCanGroup() ? (
                      <span>
                        {column.column.getIsGrouped() ? (
                          <ViewHeadlineIcon
                            style={{ verticalAlign: 'middle', cursor: 'pointer' }}
                            onClick={column.column.getToggleGroupingHandler()}
                          />
                        ) : (
                          <ViewQuiltIcon
                            style={{ verticalAlign: 'middle', cursor: 'pointer' }}
                            onClick={column.column.getToggleGroupingHandler()}
                          />
                        )}
                      </span>
                    ) : null}
                  </span>
                  {column.column.getCanFilter() ? (
                    <div>
                      <Filter column={column.column} count={table.getFilteredRowModel().rows.length} />
                    </div>
                  ) : null}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableHead>
        <TableBody>
          {table.getRowModel().rows.map((row, i) => {
            //prepareRow(row)
            return (
              <React.Fragment>
                <TableRow key={row.id} hover={true}>
                  {row.getVisibleCells().map((cell) => {
                    return (
                      <TableCell className={classes.tableCell} style={{ whiteSpace: 'pre-line' }} key={cell.id}>
                        {cell.getIsGrouped() ? (
                          <div>
                            <IconButton size='small' aria-label='expand' color='inherit' onClick={row.getToggleExpandedHandler()}>
                              {row.getIsExpanded() ? '➖' : '➕'}&nbsp;{flexRender(cell.column.columnDef.cell, cell.getContext())} (
                              {row.subRows.length})
                            </IconButton>
                          </div>
                        ) : cell.getIsAggregated() ? (
                          <span style={{ whiteSpace: 'nowrap' }}>
                            {flexRender(cell.column.columnDef.aggregatedCell, cell.getContext())}
                          </span>
                        ) : cell.getIsPlaceholder() ? null : (
                          flexRender(cell.column.columnDef.cell, cell.getContext())
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              </React.Fragment>
            )
          })}
        </TableBody>
      </MaUTable>
    </TableContainer>
  )
}

// type for data:
type TData = { [key: string]: any }

function SummaryTable(props: { onClose: () => void; header: any[]; data: TData[] }) {
  return (
    <div>
      <CssBaseline />
      <Table onClose={props.onClose} columns={props.header} data={props.data} />
    </div>
  )
}

export default SummaryTable
