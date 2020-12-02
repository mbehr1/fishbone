// copyright (c) 2020, Matthias Behr
import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import { Button, DialogContent, DialogTitle, IconButton, TextField } from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Switch from '@material-ui/core/Switch'



/**
 * open a modal dialog to edit text field information
 * @param {*} props (open, onChange, onClose)
 */
export default function TextFieldEditDialog(props) {

    console.log(`TextFieldEditDialog(open=${props.open})`);

    const [dataTextValue, setDataTextValue] = React.useState();
    const [markdownFormat, setMarkdownFormat] = React.useState();

    useEffect(() => {
        setDataTextValue(props.data?.textValue);
        setMarkdownFormat(props.data?.markdownFormat);
    }, [props.data, props.placeholder, props.label]);

    const handleClose = () => {

        props.onClose();
    }

    const toggleMarkdown = () => {
        setMarkdownFormat((prev) => !prev);
    };

    const handleSave = () => {
        console.log(`TextFieldEditDialog handleSave()`);
        console.log(` testValue=${dataTextValue}`);

        // if one differs from props.data call props.onChange
        if (typeof props.data === 'object') {
            if (dataTextValue !== props.data.textValue ||
                markdownFormat !== props.data.markdownFormat) {
                props.onChange({ ...props.data, textValue: dataTextValue, markdownFormat: markdownFormat });
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
                <FormControlLabel
                    control={<Switch checked={markdownFormat} onChange={toggleMarkdown} />}
                    label="Markdown"
                />
                <TextField name={props.label} margin="dense" id={'description-field-' + props.label}
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
