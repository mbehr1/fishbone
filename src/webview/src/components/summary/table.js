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
  useFilters,
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

// Define a default UI for filtering
function DefaultColumnFilter({
  column: { filterValue, preFilteredRows, setFilter }
}) {
  const count = preFilteredRows.length;

  return (
    <input
      value={filterValue || ""}
      onChange={(e) => {
        setFilter(e.target.value || undefined); // Set undefined to remove the filter entirely
      }}
      placeholder={`Search ${count} records...`}
    />
  );
}

function Table({ onClose, columns, data }) {
  const classes = useStyles();

  const filterTypes = React.useMemo(
    () => ({
      // Override the default text filter to use startsWith
      textStartsWith: (rows, id, filterValue) => {
        return rows.filter((row) => {
          const rowValue = row.values[id];
          return rowValue !== undefined
            ? String(rowValue)
              .toLowerCase()
              .startsWith(String(filterValue).toLowerCase())
            : true;
        });
      }
    }),
    []
  );

  const defaultColumn = React.useMemo(
    () => ({
      // Let's set up our default Filter UI
      Filter: DefaultColumnFilter
    }),
    []
  );

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
    defaultColumn,
    filterTypes
  },
    useGlobalFilter,
    useFilters
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
                  <div>{column.canFilter ? column.render('Filter') : null}</div>
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
