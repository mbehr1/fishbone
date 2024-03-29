// copyright (c) 2020 - 2023, Matthias Behr
import React from 'react'
import PropTypes from 'prop-types'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'

/**
 * MultiStateBox is like a Checkbox but with multiple states (useful if 3 or more)
 * It toggles between them or can be set.
 * In contrast to Checkbox the value will be provided as 'value' not as 'checked'
 * @param props properties to use. Mandatory: (see proptypes). Main property:
 *   values: array of { value: <valuename>, icon: Icon }
 *
 * It has no label attached.
 */

export default function MultiStateBox(props) {
  if (!Array.isArray(props.values)) return null
  if (props.values.length < 1) return null

  // determine current active value:
  const curValue = props.value
  let curValuePair = undefined
  if (curValue) {
    curValuePair = props.values.find((valuePair) => valuePair.value === curValue)
  }
  if (!curValuePair) {
    // then use the first one as default?
    curValuePair = props.values[0]
    // todo need to call onChange here?
  }

  if (!curValuePair.icon) {
    return null
  }

  const curColor = curValuePair.color || props.color // we do allow to overwrite

  const handleClick = (event) => {
    //console.warn(`MultiStateBox handleClick(...)`, event);
    event.preventDefault()
    // toggle the value through the array:
    const curIdx = props.values.findIndex((valuePair) => valuePair.value === curValue)
    let nextIdx = 0
    if (curIdx < 0) {
      // we assume 2nd then
      nextIdx = 1
    } else {
      nextIdx = (curIdx + 1) % props.values.length
    }
    const nextValue = props.values[nextIdx].value
    props.onChange({ target: { type: 'MultiStateBox', value: nextValue, name: props.name, id: props.id } }, props.propsFieldName)
  }

  const innerFragment = (
    <IconButton {...props} color={curColor} onClick={handleClick}>
      {curValuePair.icon}
    </IconButton>
  )

  if (props.tooltip) {
    return <Tooltip title={props.tooltip}>{innerFragment}</Tooltip>
  } else {
    return innerFragment
  }
}

MultiStateBox.propTypes = {
  values: PropTypes.array.isRequired,
  tooltip: PropTypes.string,
  onChange: PropTypes.func, // otherwise the option won't be stored
}
