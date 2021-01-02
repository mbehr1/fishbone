// copyright (c) 2020 - 2021, Matthias Behr
import React from 'react';
import TextField from '@material-ui/core/TextField';
import Autocomplete from '@material-ui/lab/Autocomplete';
import CircularProgress from '@material-ui/core/CircularProgress';
import { triggerRestQueryDetails } from '../util';
import { Checkbox } from '@material-ui/core';
import CheckBoxIcon from '@material-ui/icons/CheckBox';
import CheckBoxOutlineBlankIcon from '@material-ui/icons/CheckBoxOutlineBlank';

/*function sleep(delay = 0) {
    return new Promise((resolve) => {
        setTimeout(resolve, delay);
    });
}*/

// todo add props types:
// currently expected: dataProvider (object), attributes[] (from state.attributes)

export default function InputDataProvided(props) {
    const [open, setOpen] = React.useState(false);
    const [options, setOptions] = React.useState([]);
    const loading = open && options.length === 0;

    //console.log(`InputDataProvided(props=${JSON.stringify(props)}) loading=${loading} called`);
    console.log(`InputDataProvided(value=${JSON.stringify(props?.value)} props=${props?.dataProvider?.source}) loading=${loading} called`);

    React.useEffect(() => {
        let active = true;

        if (!loading) {
            return undefined;
        }

        (async () => {
            triggerRestQueryDetails(props.dataProvider, props.attributes).then((res) => {
                console.log(`InputDataProvided got response ${JSON.stringify(res)}`);
                if (active) {
                    setOptions('result' in res ? res.result : [res.error]);
                }
            });
        })();

        // this function as we return it from the hook will be called on cleanup
        // see e.g. https://reactjs.org/docs/hooks-effect.html
        return () => {
            active = false;
        };
    }, [loading, props.dataProvider, props.attributes]); // only rerun the effect if loading changes! (if multiple expr. inside its called if any changes)

    React.useEffect(() => {
        if (!open) {
            setOptions([]);
        }
    }, [open]);

    const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
    const checkedIcon = <CheckBoxIcon fontSize="small" />;

    /**
     * 
     * @param {*} option the single value to return the label from
     * @returns string with the label to use for that option/value 
     */

    const getOptionLabel = (option) => {
        console.log(`getOptionLabel()`, option);

        if (typeof option === 'string') return option;
        if (option === null || option === undefined) return '<null|undefined>';
        if ('label' in option) { return option.label; }

        return JSON.stringify(option).slice(0, 20);
    };

    return (
        <Autocomplete
            id={props.id}
            multiple={props.multiple}
            disableCloseOnSelect={props.multiple}
            style={{ width: 400 }}
            open={open}
            onOpen={() => {
                setOpen(true);
            }}
            onClose={() => {
                setOpen(false);
            }}
            value={props.multiple ? (Array.isArray(props.value) ? props.value : []) : props.value}
            onChange={(event, value, reason) => { /*console.warn(`Autocomplete.onChange(value=`, value, `reason=${reason}`); */ props.onChange({ target: { type: 'DataProvider', name: props.id, value: value } }); }}
            getOptionSelected={(option, value) => { /* console.warn(`getOptionSelected`, option, value); */ return getOptionLabel(option) === getOptionLabel(value) }}
            getOptionLabel={getOptionLabel}
            options={options}
            loading={loading}
            freeSolo
            renderOption={props.multiple ? ((option, { selected }) => (
                <React.Fragment>
                    <Checkbox
                        icon={icon}
                        checkedIcon={checkedIcon}
                        style={{ marginRight: 8 }}
                        checked={selected}
                    />
                    {getOptionLabel(option)}
                </React.Fragment>
            )) : undefined}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={props.label}
                    variant="outlined"
                    InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                            <React.Fragment>
                                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                                {params.InputProps.endAdornment}
                            </React.Fragment>
                        ),
                    }}
                />
            )}
        />
    );
}