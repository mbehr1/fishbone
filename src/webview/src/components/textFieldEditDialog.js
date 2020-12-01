// copyright (c) 2020, Matthias Behr
import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import { Button, DialogContent, DialogTitle, IconButton, TextField } from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';

/**
 * open a modal dialog to edit text field information
 * @param {*} props (open, onChange, onClose)
 */
export default function TextFieldEditDialog(props) {

    console.log(`TextFieldEditDialog(open=${props.open})`);

    const [dataTextValue, setDataTextValue] = React.useState();
    const [dataRenderFormat, setRenderFormat] = React.useState();

    useEffect(() => {
        setDataTextValue(props.data?.textValue);
        setRenderFormat(props.data?.renderFormat);
    }, [props.data], props.placeholder, props.label);

    const handleClose = () => {

        props.onClose();
    }

    const handleSave = () => {
        console.log(`TextFieldEditDialog handleSave()`);
        console.log(` testValue=${dataTextValue}`);

        // if one differs from props.data call props.onChange
        if (typeof props.data === 'object') {
            if (dataTextValue !== props.data.textValue ||
                dataRenderFormat !== props.data.renderFormat) {
                props.onChange({ ...props.data, textValue: dataTextValue, renderFormat: dataRenderFormat });
            }
        }
        props.onClose();
    };

    return (
        <Dialog fullWidth={true} open={props.open} maxWidth='md' onClose={handleClose}>
            <DialogTitle id="textFieldEditDialogTitle">
                {props.label}
                <IconButton onClick={handleClose} color="primary" style={{ position: 'absolute', right: 1 }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <TextField name={props.data.name} margin="dense" id={'description-field-' + props.data.name}
                    InputLabelProps={{ shrink: true, }} fullWidth multiline value={dataTextValue} onChange={(event) => setDataTextValue(event.target.value)}
                    placeholder={props.placeholder} />
            </DialogContent>
            <DialogActions>
                <Button autoFocus onClick={handleSave} color="primary">
                    Save changes
                </Button>
            </DialogActions>
        </Dialog>
    );
};

TextFieldEditDialog.propTypes = {
    data: PropTypes.object.isRequired,
    open: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired, // otherwise the option won't be stored
    onClose: PropTypes.func.isRequired,
    applyMode: PropTypes.bool
};
