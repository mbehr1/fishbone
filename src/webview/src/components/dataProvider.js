// copyright (c) 2020, Matthias Behr
import React from 'react';
import TextField from '@material-ui/core/TextField';
import Autocomplete from '@material-ui/lab/Autocomplete';
import CircularProgress from '@material-ui/core/CircularProgress';
import { sendAndReceiveMsg } from '../util';
import jp from 'jsonpath' 

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

    console.log(`InputDataProvided(props=${JSON.stringify(props)}) loading=${loading} called`);

    React.useEffect(() => {
        let active = true;

        if (!loading) {
            return undefined;
        }

        (async () => {
            // the source can contain attributes referred to as e.g. ${attribute.name} for a reference to "name" attribute 
            // need to replace them here
            const requestStr = props.dataProvider.source.replace(/\$\{(.*?)\}/g, (match, p1, offset) => {
                //console.log(`replacing '${match}' '${p1}' at offset ${offset}`);
                if (p1.startsWith("attributes.")) { // currently only attribute supported
                    const attrName = p1.slice(p1.indexOf('.') + 1);
                    console.log(`attrName='${attrName}'`);
                    const attribute = props.attributes.find(attr => Object.keys(attr)[0] === attrName);
                    if (attribute !== undefined) {
                        const attrValue = attribute[attrName].value;
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
                    if (props.dataProvider.jsonPath) {
                        const data = jp.query(res.data, props.dataProvider.jsonPath);
                        console.log(`jsonPath('${props.dataProvider.jsonPath}') returned '${JSON.stringify(data)}'`);
                        setOptions(data.map((elem) => { return { name: elem } }));
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

    return (
        <Autocomplete
            id={props.id}
            style={{ width: 300 }}
            open={open}
            onOpen={() => {
                setOpen(true);
            }}
            onClose={() => {
                setOpen(false);
            }}
            value={{ name: props.value }}
            onChange={(event, value) => { console.log(`Autocomplete.onChange(value=`, value); props.onChange({ target: { type: 'DataProvider', name: props.id, value: value?.name } }); }}
            getOptionSelected={(option, value) => option.name === value.name}
            getOptionLabel={(option) => option.name}
            options={options}
            loading={loading}
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