import React from 'react'

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
    <select
      value={filterValue}
      onChange={e => {
        setFilter(e.target.value || undefined)
      }}
    >
      <option value="">All</option>
      {options.map((option, i) => (
        <option key={i} value={option}>
          {option}
        </option>
      ))}
    </select>
  )
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
          },
          {
            Header: 'Category',
            accessor: 'category',
          },
          {
            Header: 'Root Cause',
            accessor: 'rc',
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
          },
          {
            Header: 'Background',
            accessor: 'background',
          },
          {
            Header: 'Instructions',
            accessor: 'instructions',
          },
          {
            Header: 'Comments',
            accessor: 'comments',
          },
        ],
      },
    ],
    []
  )
}

export function SummaryDataProvider(rawData) {
  var tableData = [];

  rawData.forEach(effect => {
    console.log(`effect.name=${effect.name}`);
    effect.categories.forEach(category => {
      for (let i = 0; i < category.rootCauses.length; ++i) {
        const rc = category.rootCauses[i];
        if (typeof rc === 'object') {
          if ('props' in rc) {
            const props = rc.props;

            tableData.push({
              effect: typeof effect.name === 'string' ? effect.name : '',
              category: typeof category.name === 'string' ? category.name : '',
              rc: props.label && typeof props.label === 'string' ? props.label : '',
              value: props.value && typeof props.value === 'string' ? props.value : 'open',

              instructions: RenderConditionText({ markdownActive: GetMarkdownActive(props.instructions), text: GetTextValue(props.instructions) }),
              background: RenderConditionText({ markdownActive: GetMarkdownActive(props.backgroundDescription), text: GetTextValue(props.backgroundDescription) }),
              comments: RenderConditionText({ markdownActive: GetMarkdownActive(props.comments), text: GetTextValue(props.comments) })
            });
          }

          if (rc.type === 'nested') {
            // TODO: walk the tree down
          }
        }
      }
    });
  });
  return tableData;
}
