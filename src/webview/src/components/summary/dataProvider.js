import React from 'react'

import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';

import { GetMarkdownActive, GetTextValue, RenderConditionText } from './../utils/markdown'

// This is a custom filter UI for selecting
// a unique option from a list
function SelectColumnFilter({
  column: { filterValue, setFilter, preFilteredRows, id },
}) {
  // Calculate the options for filtering
  // using the preFilteredRows
  const options = React.useMemo(() => {
    const options = new Set()
    preFilteredRows.forEach(row => {
      options.add(row.values[id])
    })
    return [...options.values()]
  }, [id, preFilteredRows])

  // Render a multi-select box
  return (
    <FormControl>
      <Select
        native
        style={{ paddingHorizontal: '2px' }}
        value={filterValue}
        onChange={e => {
          setFilter(e.target.value || undefined)
        }}
        inputProps={{
          id: 'select-filter-input',
        }}
      >
        <option value="">&nbsp;All</option>
        {options.map((option, i) => (
          <option key={i} value={option} >
            &nbsp;{option}
          </option>
        ))}
      </Select>
    </FormControl >
  )
}

function getStatusAggregator(values) {
  var openCount = 0, okCount = 0, errorCount = 0;

  values.forEach(value => {
    if (typeof value === 'string') {
      switch (value) {
        case 'open':
          openCount++;
          break;
        case 'ok':
          okCount++;
          break;
        case 'error':
          errorCount++;
          break;
        default:
          console.log(`getStatusAggregator: Invalid status type ${value}`);
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
            aggregate: 'count',
            Aggregated: ({ value }) => `${value} Effects`,
          },
          {
            Header: 'Category',
            accessor: 'category',
            aggregate: 'count',
            Aggregated: ({ value }) => `${value} Categories`,
          },
          {
            Header: 'Root Cause',
            accessor: 'rc',
            disableGroupBy: true,
            aggregate: 'count',
            Aggregated: ({ value }) => `${value} Root Causes`,
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
            Aggregated: ({ value }) => `${value[0]}? / ${value[1]}✔ / ${value[2]}❌`,
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
    []
  )
}

export function SummaryDataProvider(rawData, nestingLevel = 0) {

  console.log(rawData);

  var tableData = [];

  rawData.forEach(effect => {
    effect.categories.forEach(category => {
      for (let i = 0; i < category.rootCauses.length; ++i) {
        const rc = category.rootCauses[i];
        if (typeof rc === 'object') {
          if ('props' in rc) {
            const props = rc.props;

            tableData.push({
              effect: typeof effect.name === 'string' ?
                (nestingLevel > 0 ? ' '.repeat(nestingLevel) + 'L' + nestingLevel + ': ' + effect.name : effect.name)
                : '',

              category: typeof category.name === 'string' ? category.name : '',
              rc: props.label && typeof props.label === 'string' ? props.label : '',
              value: props.value && typeof props.value === 'string' ? props.value : 'open',

              instructions: RenderConditionText({ markdownActive: GetMarkdownActive(props.instructions), text: GetTextValue(props.instructions) }),
              background: RenderConditionText({ markdownActive: GetMarkdownActive(props.backgroundDescription), text: GetTextValue(props.backgroundDescription) }),
              comments: RenderConditionText({ markdownActive: GetMarkdownActive(props.comments), text: GetTextValue(props.comments) })
            });
          }

          if (rc.type === 'nested') {
            tableData = tableData.concat(SummaryDataProvider(rc.data, ++nestingLevel));
            nestingLevel--;
          }
        }
      }
    });
  });
  return tableData;
}