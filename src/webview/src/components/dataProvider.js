// copyright (c) 2020, Matthias Behr
import React from 'react';
import TextField from '@material-ui/core/TextField';
import Autocomplete from '@material-ui/lab/Autocomplete';
import CircularProgress from '@material-ui/core/CircularProgress';
import { sendAndReceiveMsg } from '../util';

/*function sleep(delay = 0) {
    return new Promise((resolve) => {
        setTimeout(resolve, delay);
    });
}*/

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
            sendAndReceiveMsg({ type: 'restQuery', request: props.dataProvider }).then((res) => {
                console.log(`InputDataProvided got response ${JSON.stringify(res)}`);
                if (active) {
                    //setOptions(Object.keys(countries).map((key) => countries[key].item[0]));
                    setOptions([{ name: "test", res: res }]);
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
    }, [loading, props.dataProvider]); // only rerun the effect if loading changes! (if multiple expr. inside its called if any changes)

    React.useEffect(() => {
        if (!open) {
            setOptions([]);
        }
    }, [open]);

    return (
        <Autocomplete
            id="asynchronous-demo"
            style={{ width: 300 }}
            open={open}
            onOpen={() => {
                setOpen(true);
            }}
            onClose={() => {
                setOpen(false);
            }}
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