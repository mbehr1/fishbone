// copyright (c) 2020 - 2021, Matthias Behr
import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import { Button, DialogContent, DialogTitle, IconButton, TextField, Typography, Link } from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import ErrorIcon from '@material-ui/icons/Error';

// todo move those two functions into a util class. It's currently duplicated in docs.

const rqUriDecode = (rq) => {
    if (!rq || rq.length === 0) { return ''; }

    let toRet = '';
    const indexOfQ = rq?.indexOf('?');
    if (indexOfQ > 0) {
        toRet += rq.slice(0, indexOfQ + 1) + '\n';
        const options = rq.slice(indexOfQ + 1);
        const optionArr = options.split('&');
        let andCnt = 0;
        for (const commandStr of optionArr) {
            const eqIdx = commandStr.indexOf('=');
            const command = commandStr.slice(0, eqIdx);
            const commandParams = decodeURIComponent(commandStr.slice(eqIdx + 1));
            if (andCnt) { toRet += ' &\n'; }
            andCnt++;
            try {
                toRet += command + '=' + JSON.stringify(JSON.parse(commandParams), ' ', 2) + '\n';
            } catch {
                if (commandParams.includes('{') || commandParams.includes('[') || commandParams.includes('"')) {
                    toRet += `\n<cannot parse: \n'${command}=${commandParams}'\n as JSON>`;
                } else {
                    toRet += `${command}=${commandParams}`;
                }
            }
        }
    } else { toRet = rq; }

    return toRet;
};

const rqUriEncode = (rq) => {
    let ok = true;
    let toRet = '';
    const indexOfQ = rq?.indexOf('?');
    if (indexOfQ > 0) {
        toRet += rq.slice(0, indexOfQ + 1);
        // we expect the & split by &\n (could parse as well JSON char by char until valid JSON)
        const options = rq.slice(indexOfQ + 1);
        const optionArr = options.split('&\n');
        let andCnt = 0;
        for (let commandStr of optionArr) {
            commandStr = commandStr.replace(/^\s+|\s+$/g, "");
            const eqIdx = commandStr.indexOf('=');
            if (andCnt) { toRet += '&'; }
            andCnt++;
            if (eqIdx >= 0) {
                const command = commandStr.slice(0, eqIdx);
                const commandParam = commandStr.slice(eqIdx + 1);
                try {
                    const commandParamEncoded = encodeURIComponent(JSON.stringify(JSON.parse(commandParam)));
                    toRet += `${command}=${commandParamEncoded}`;
                } catch {
                    // if its a simple string then it's ok
                    if (commandParam.includes('{') || commandParam.includes('[') || commandParam.includes('"')) {
                        toRet += `&\n<cannot parse: \n'${command}=${commandParam}'\n as JSON>`;
                        ok = false;
                    } else {
                        toRet += `${command}=${commandParam}`;
                    }
                }
            } else {
                toRet += `${commandStr}`;
            }
        }
    } else { toRet = rq; }
    return [ok, toRet];
};

/**
 * open a modal dialog to define DLT filter settings
 * @param {*} props (open, onChange, onClose, applyMode)
 */
export default function DLTRestQueryManualDialog(props) {

    console.log(`DLTRestQueryManualDialog(open=${props.open}, applyMode=${props.applyMode})`);

    // const [dataSource, setDataSource] = React.useState(props.dataSource);
    const [text, setText] = React.useState(props.dataSource);
    const [json, setJson] = React.useState(rqUriDecode(props.dataSource));
    const [error, setError] = React.useState('');

    useEffect(() => {
        try {
            const [ok, newText] = rqUriEncode(json);
            if (ok) {
                if (newText !== text) { setText(newText); }
                setError('');
            } else {
                // todo set error indicator
                setError(newText);
            }
        } catch {

        }
    }, [json, text]);

    const handleClose = () => {
        props.onClose();
    }
    const handleSave = () => {
        console.log(`DLTRestQueryManualDialog handleSave()`);
        console.log(` dataSource=${text}`);

        props.onChange(text); // dont check for changes
        props.onClose();
    };
    return (
        <Dialog fullScreen open={props.open} onClose={handleClose}>
            <DialogTitle id="dltRestQueryManualDialogTitle">
                DLT rest query manual edit...
                <IconButton onClick={handleClose} color="inherit" style={{ position: 'absolute', right: 1 }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Typography variant="h5" gutterBottom>
                    DLT-Logs rest query needs to be URI decoded (done automatically here).
                    After commands separated by &amp; a new line has to follow.
                    Details see <Link href="https://mbehr1.github.io/fishbone/docs/badges" >docs</Link>
                </Typography>
                <TextField name="DLT rest query" margin="dense" id={'description-field-rest-query'}
                    label="DLT-Logs rest query:"
                    error={error.length > 0}
                    rowsMax={35}
                    InputLabelProps={{ shrink: true, }} fullWidth multiline value={json} onChange={(event) => setJson(event.target.value)}
                ></TextField>
                <div />
                {
                    error.length > 0 && <div>
                        <ErrorIcon />
                        <TextField error label="Error:" name="DLT rest query error" margin="dense" id={'description-field-rest-query-error'}
                            InputLabelProps={{ shrink: true, }} fullWidth multiline value={error}
                        ></TextField>
                    </div>
                }
            </DialogContent>
            <DialogActions>
                <Button size="small" autoFocus onClick={handleSave} color="primary">
                    Save changes
                </Button>
            </DialogActions>
        </Dialog>
    );
}

DLTRestQueryManualDialog.propTypes = {
    dataSource: PropTypes.string.isRequired,
    open: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired, // otherwise the option won't be stored
    onClose: PropTypes.func.isRequired,
    applyMode: PropTypes.bool
};
