import React from 'react'

import CssBaseline from '@material-ui/core/CssBaseline'
import MaUTable from '@material-ui/core/Table'
import TableBody from '@material-ui/core/TableBody'
import TableCell from '@material-ui/core/TableCell'
import TableHead from '@material-ui/core/TableHead'
import TableRow from '@material-ui/core/TableRow'
import TableContainer from '@material-ui/core/TableContainer'
import { makeStyles } from '@material-ui/styles'
import Divider from '@material-ui/core/Divider'

import TableToolbar from './tableToolbar'

import {
  useGlobalFilter,
  useTable,
} from 'react-table'

const useStyles = makeStyles(theme => ({
  root: {},
  tableCell: {
    borderWidth: 1,
    borderSpacing: 0,
    borderStyle: 'solid'
  }
}));

function Table({ onClose, columns, data }) {
  const classes = useStyles();

  const {
    getTableProps,
    headerGroups,
    rows,
    prepareRow,
    preGlobalFilteredRows,
    setGlobalFilter,
    state: { globalFilter },
  } = useTable({
    columns,
    data,
  }
    , useGlobalFilter
  )

  return (
    <TableContainer>
      <TableToolbar
        preGlobalFilteredRows={preGlobalFilteredRows}
        setGlobalFilter={setGlobalFilter}
        globalFilter={globalFilter}
        onClose={onClose}
      />
      <MaUTable {...getTableProps()}>
        <TableHead>
          {headerGroups.map(headerGroup => (
            <TableRow {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map(column => (
                <TableCell className={classes.tableCell} {...column.getHeaderProps()}>
                  {column.render('Header')}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableHead>
        <TableBody>
          {rows.map((row, i) => {
            prepareRow(row)
            return (
              <React.Fragment>
                <TableRow hover={true} {...row.getRowProps()}>
                  {row.cells.map(cell => {
                    return (
                      <TableCell className={classes.tableCell} style={{ whiteSpace: 'pre-line' }} {...cell.getCellProps()}>
                        {cell.render('Cell')}
                      </TableCell>
                    )
                  })}
                </TableRow>
                <Divider></Divider>
              </React.Fragment>
            )
          })}
        </TableBody>
      </MaUTable>
    </TableContainer>
  )
}

function SummaryTable(props) {
  return (
    <div>
      <CssBaseline />
      <Table onClose={props.onClose} columns={props.header} data={props.data} />
    </div>
  )
}

export default SummaryTable
