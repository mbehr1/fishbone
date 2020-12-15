import React from 'react'

import CssBaseline from '@material-ui/core/CssBaseline'
import MaUTable from '@material-ui/core/Table'
import TableBody from '@material-ui/core/TableBody'
import TableCell from '@material-ui/core/TableCell'
import TableHead from '@material-ui/core/TableHead'
import TableRow from '@material-ui/core/TableRow'
import TableContainer from '@material-ui/core/TableContainer'
import { makeStyles } from '@material-ui/core/styles'
import InputAdornment from '@material-ui/core/InputAdornment'
import TextField from '@material-ui/core/TextField'
import SearchIcon from '@material-ui/icons/Search'
import ViewHeadlineIcon from '@material-ui/icons/ViewHeadline'
import ViewQuiltIcon from '@material-ui/icons/ViewQuilt'

import TableToolbar from './tableToolbar'

import {
  useFilters,
  useGlobalFilter,
  useTable,
  useExpanded,
  useGroupBy
} from 'react-table'

const useStyles = makeStyles(theme => ({
  root: {},
  tableCell: {
    borderWidth: '1px',
    padding: '5px',
    borderStyle: 'solid'
  }
}));

// Define a default UI for filtering
function DefaultColumnFilter({
  column: { filterValue, preFilteredRows, setFilter }
}) {
  const count = preFilteredRows.length;

  return (
    <div>
      <TextField
        value={filterValue || ''}
        onChange={e => {
          setFilter(e.target.value || undefined) // Set undefined to remove the filter entirely
        }}
        placeholder={`${count} records...`}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />
    </div>
  );
}

function Table({ onClose, columns, data }) {
  const classes = useStyles();

  const filterTypes = React.useMemo(
    () => ({
      // Override the default text filter to use String.includes
      customFilter: (rows, id, filterValue) => {
        return rows.filter((row) => {
          var match = false;

          id.forEach(column => {
            const rowValue = row.values[column];

            // Check for trivial data types
            if (typeof rowValue === 'string') {
              match = match || String(rowValue)
                .toLowerCase()
                .includes(String(filterValue).toLowerCase())
            }

            // Check for special data types
            var rowString = undefined;
            if (rowValue && rowValue.props) {
              if (typeof rowValue.props.children === 'string')
                rowString = rowValue.props.children;
              else if (rowValue.props.dangerouslySetInnerHTML && typeof rowValue.props.dangerouslySetInnerHTML.__html === 'string')
                rowString = rowValue.props.dangerouslySetInnerHTML.__html;

              match = match || String(rowString)
                .toLowerCase()
                .includes(String(filterValue).toLowerCase())
            }
          });

          return match;
        });
      },
    }),
    []
  );

  function customGroupBy(rows, columnId) {
    return rows.reduce((prev, row, i) => {
      var resKey = '';

      if (typeof row.values[columnId] === 'string') {
        resKey = `${row.values[columnId]}`
      } else if (typeof row.values[columnId].key === 'string') {
        resKey = `${row.values[columnId].key}`
      }

      prev[resKey] = Array.isArray(prev[resKey]) ? prev[resKey] : []
      prev[resKey].push(row)
      return prev
    }, {})
  }

  const defaultColumn = React.useMemo(
    () => ({
      // Let's set up our default Filter UI
      Filter: DefaultColumnFilter
    }),
    []
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    preGlobalFilteredRows,
    setGlobalFilter,
    toggleAllRowsExpanded,
    expandAllSubComponents,
    state: { globalFilter },
  } = useTable({
    columns,
    data,
    defaultColumn,
    initialState: {
      groupBy: ['effect', 'category']
    },
    filterTypes,
    globalFilter: 'customFilter',
    groupByFn: customGroupBy,
    autoResetPage: false,
    autoResetExpanded: false,
  },
    useGlobalFilter,
    useFilters,
    useGroupBy,
    useExpanded
  )

  /* https://github.com/tannerlinsley/react-table/issues/2404#issuecomment-644917151 */
  React.useEffect(() => {
    toggleAllRowsExpanded(expandAllSubComponents);
  }, [expandAllSubComponents, toggleAllRowsExpanded]);

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
                  <span style={{ whiteSpace: 'nowrap' }}>
                    {column.render('Header')}
                    {column.canGroupBy ? (
                      // If the column can be grouped, let's add a toggle
                      <span {...column.getGroupByToggleProps()}>
                        {column.isGrouped ? <ViewHeadlineIcon style={{ verticalAlign: 'middle' }} /> : <ViewQuiltIcon style={{ verticalAlign: 'middle' }} />}
                      </span>
                    ) : null}
                  </span>
                  <div>{column.canFilter ? column.render('Filter') : null}</div>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableHead>
        <TableBody {...getTableBodyProps()}>
          {rows.map((row, i) => {
            prepareRow(row)
            return (
              <React.Fragment>
                <TableRow hover={true} {...row.getRowProps()}>
                  {row.cells.map(cell => {
                    return (
                      <TableCell className={classes.tableCell} style={{ whiteSpace: 'pre-line' }} {...cell.getCellProps()}>
                        {cell.isGrouped ? (
                          <div>
                            <span {...row.getToggleRowExpandedProps()}>
                              {row.isExpanded ? '➖' : '➕'}
                            </span>{' '}
                            {cell.render('Cell', { editable: false })} (
                            {row.subRows.length})
                          </div>
                        ) : cell.isAggregated ? (
                          <span style={{ whiteSpace: 'nowrap' }}>
                            {cell.render('Aggregated')}
                          </span>
                        ) : cell.isPlaceholder ? null : (
                          cell.render('Cell', { editable: true })
                        )
                        }
                      </TableCell>
                    )
                  })}
                </TableRow>
              </React.Fragment>
            )
          })}
        </TableBody>
      </MaUTable>
    </TableContainer >
  )
}

function SummaryTable(props) {
  // Set all the rows index to true
  const defaultExpandedRows = props.data.map((element, index) => {
    return { index: true };
  });

  return (
    <div>
      <CssBaseline />
      <Table
        defaultExpanded={defaultExpandedRows}
        onClose={props.onClose}
        columns={props.header}
        data={props.data} />
    </div>
  )
}

export default SummaryTable
