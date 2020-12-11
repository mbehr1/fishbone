import React from 'react'

import { GetMarkdownActive, GetTextValue, RenderConditionText } from './../utils/markdown'

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
