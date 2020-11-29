// copyright (c) 2020, Matthias Behr
import React from 'react';
import TextField from '@material-ui/core/TextField';
import Autocomplete from '@material-ui/lab/Autocomplete';
import CircularProgress from '@material-ui/core/CircularProgress';
import { sendAndReceiveMsg } from '../util';
import jp from 'jsonpath' 
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
            // the source can contain attributes referred to as e.g. ${attribute.name} for a reference to "name" attribute 
            // need to replace them here
            // todo use restQueryDetails here as well...
            const requestStr = props.dataProvider.source.replace(/\$\{(.*?)\}/g, (match, p1, offset) => {
                //console.log(`replacing '${match}' '${p1}' at offset ${offset}`);
                if (p1.startsWith("attributes.")) { // currently only attribute supported
                    const attrName = p1.slice(p1.indexOf('.') + 1);
                    console.log(`attrName='${attrName}'`);
                    const attribute = props.attributes.find(attr => Object.keys(attr)[0] === attrName);
                    if (attribute !== undefined) {
                        const attrValue = attribute[attrName].value || "";
                        console.log(`attrValue='${attrValue}'`, attribute);
                        return attrValue;
                    }
                    return `<unknown attribute:${attrName}>`;
                }
                return `<unknown ${p1}>`;
            });

            sendAndReceiveMsg({ type: 'restQuery', request: requestStr }).then((res) => {
                console.log(`InputDataProvided got response ${JSON.stringify(res)}`);
                if (active) {
                    // todo got an error?
                    // do we have a jsonPath?
                    if (props.dataProvider.jsonPath && res.data) {
                        const data = jp.query(res.data, props.dataProvider.jsonPath);
                        console.log(`jsonPath('${props.dataProvider.jsonPath}') returned '${JSON.stringify(data)}'`);
                        setOptions(data);
                    }
                    //setOptions(Object.keys(countries).map((key) => countries[key].item[0]));
                }
            });
            // await sleep(1e3); // For demo purposes.
            //            const countries = await response.json();

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