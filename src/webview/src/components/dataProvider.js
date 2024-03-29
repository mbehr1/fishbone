// copyright (c) 2020 - 2023, Matthias Behr
import React from 'react'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import CircularProgress from '@mui/material/CircularProgress'
import { triggerRestQueryDetails } from '../util'
import { Checkbox } from '@mui/material'
import CheckBoxIcon from '@mui/icons-material/CheckBox'
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank'

// todo add props types:
// currently expected: dataProvider (object), attributes[] (from state.attributes)

/**
 *
 * @param {*} option the single value to return the label from
 * @returns string with the label to use for that option/value
 */

function getOptionLabel(option) {
  //console.log(`getOptionLabel(typeof option=${typeof option})`, option);

  if (typeof option === 'string') return option
  if (option === null || option === undefined) return '<null|undefined>'
  if ('label' in option) {
    return option.label
  }

  return JSON.stringify(option).slice(0, 20)
}

function containsUnknownValue(value, options) {
  if (value === null || value === undefined || value === '') return false
  if (Array.isArray(value) && value.length === 0) return false
  if (!Array.isArray(options)) return false
  if (options.length === 0) return true // value is not in options!

  const labelOptions = options.map((opt) => getOptionLabel(opt))

  if (Array.isArray(value)) {
    // if any value is not in options return true;
    for (let i = 0; i < value.length; ++i) {
      const val = getOptionLabel(value[i])
      if (labelOptions.indexOf(val) < 0) return true
    }
  } else {
    // !Array(value)
    if (value === null) return false
    if (labelOptions.indexOf(getOptionLabel(value)) < 0) return true
  }
  return false
}

export default function InputDataProvided(props) {
  const [open, setOpen] = React.useState(false)
  const [options, setOptions] = React.useState([])
  const [loadOptions, setLoadOptions] = React.useState(true)
  const loading = open && loadOptions
  const hasUnknownValue = React.useMemo(
    () => !loadOptions && containsUnknownValue(props?.value, options),
    [loadOptions, options, props.value],
  )

  /*console.log(
    `InputDataProvided(value=${JSON.stringify(props?.value)} props=${
      props?.dataProvider?.source
    }) loading=${loading} called. hasUnknownValue=${hasUnknownValue}`,
  )*/

  // if attributes change we do have to reload the options:
  React.useEffect(() => {
    setLoadOptions(true)
  }, [props.attributes])

  React.useEffect(() => {
    if (!loadOptions) {
      // already loaded
      // console.warn(`InputDataProvided effect for loading options called loadOptions=${loadOptions}`);
      return undefined
    }
    let active = true
    //console.log(`InputDataProvided effect for loading options triggering...`)
    const triggerFn = async () => {
      triggerRestQueryDetails(props.dataProvider, props.attributes).then((res) => {
        // console.log(`InputDataProvided active=${active} got response with len=${JSON.stringify(res).length}`)
        if (active) {
          setOptions('result' in res ? res.result : [res.error])
          setLoadOptions(false)
        }
      })
    }
    triggerFn()

    // this function as we return it from the hook will be called on cleanup
    // see e.g. https://reactjs.org/docs/hooks-effect.html
    return () => {
      // console.log(`InputDataProvided cleanup hook called active=${active}`)
      active = false
    }
  }, [loadOptions, props.dataProvider, props.attributes])

  const icon = <CheckBoxOutlineBlankIcon fontSize='small' />
  const checkedIcon = <CheckBoxIcon fontSize='small' />

  return (
    <Autocomplete
      id={props.id}
      multiple={props.multiple}
      disableCloseOnSelect={props.multiple}
      style={{ width: 400 }}
      ChipProps={{ color: 'secondary' }}
      open={open}
      onOpen={() => {
        setOpen(true)
      }}
      onClose={() => {
        setOpen(false)
      }}
      value={props.multiple ? (Array.isArray(props.value) ? props.value : []) : props.value}
      onChange={(event, value, reason) => {
        /*console.warn(`Autocomplete.onChange(value=`, value, `reason=${reason}`); */ props.onChange({
          target: { type: 'DataProvider', name: props.id, value: value },
        })
      }}
      isOptionEqualToValue={(option, value) => {
        /* console.warn(`getOptionSelected`, option, value); */ return getOptionLabel(option) === getOptionLabel(value)
      }}
      getOptionLabel={getOptionLabel}
      options={options}
      loading={loading}
      freeSolo
      autoSelect={!props.multiple}
      renderOption={
        props.multiple
          ? (props, option, { selected }) => (
              <li {...props}>
                <Checkbox icon={icon} checkedIcon={checkedIcon} style={{ marginRight: 8 }} checked={selected} />
                {getOptionLabel(option)}
              </li>
            )
          : undefined
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={props.label}
          variant='outlined'
          InputProps={{
            ...params.InputProps,
            error: hasUnknownValue,
            endAdornment: (
              <React.Fragment>
                {loading ? <CircularProgress color='inherit' size={20} /> : null}
                {params.InputProps.endAdornment}
              </React.Fragment>
            ),
          }}
        />
      )}
    />
  )
}
