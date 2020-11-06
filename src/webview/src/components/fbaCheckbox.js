// copyright (c) 2020, Matthias Behr
import React from 'react';
import PropTypes from 'prop-types';
import Container from '@material-ui/core/Container';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import Tooltip from '@material-ui/core/Tooltip';
import IconButton from '@material-ui/core/IconButton';
import EditIcon from '@material-ui/icons/Edit';
import FilterListIcon from '@material-ui/icons/FilterList';
import CheckBoxIcon from '@material-ui/icons/CheckBox';
import CheckBoxOutlineBlankIcon from '@material-ui/icons/CheckBoxOutlineBlank';
import ErrorIcon from '@material-ui/icons/Error';

import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import Button from '@material-ui/core/Button';
import MuiAlert from '@material-ui/lab/Alert';
import { ButtonGroup, Snackbar, TextField } from '@material-ui/core';


// import Grid from '@material-ui/core/Grid';
// import Autocomplete from '@material-ui/lab/Autocomplete';
// import CircularProgress from '@material-ui/core/CircularProgress';
// import { sendAndReceiveMsg } from '../util';
// import jp from 'jsonpath'

// todo
// - remove tooltip completely when undefined
// - implement tri-state (or more for warning?) for the icon
// - highlight current selection with a different text. e.g. "keep as OK", ...
// - add id= to buttons...
// - use e.g. react-markdown to support markdown for background, desc, comments

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

export default function FBACheckbox(props) {

    const [editOpen, setEditOpen] = React.useState(false);
    const [applyFilterBarOpen, setApplyFilterBarOpen] = React.useState(false);

    // values that can be changed:
    const [values, setValues] = React.useState({ 'comments': props.comments });
    const handleValueChanges = e => {
        const { name, value } = e.target;
        console.log(`handleValueChange name=${name}, value=${value}`);
        setValues({ ...values, [name]: value })
    }


    const handleClickOpen = () => {
        setEditOpen(true);
    };

    const handleClose = () => {
        setEditOpen(false);
        // update values... todo (event) => props.onChange(event, 'comments')
        if (values.comments !== props.comments) {
            props.onChange({ target: { type: 'textfield', value: values.comments } }, 'comments'); // todo rethink interface to update multiple attrs
        }
    };

    const handleFilterBarClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setApplyFilterBarOpen(false);
    }

    const backgroundFragments = props.backgroundDescription ? (
        <React.Fragment>
            <DialogContentText variant='h5'>Background</DialogContentText><DialogContentText paragraph>
                {props.backgroundDescription}
            </DialogContentText>
        </React.Fragment>
    ) : null;

    const instructionsFragment = props.instructions ? (
        <React.Fragment>
            <DialogContentText variant='h5'>Instructions</DialogContentText>
            <DialogContentText paragraph>
                {props.instructions}
            </DialogContentText>
        </React.Fragment>
    ) : null;

    return (
        <Container>
            <Tooltip title={props.tooltip || 'no tooltip provided'}>
                <FormControlLabel control={
                    <Checkbox {...props} color="primary"></Checkbox>
                } label={props.label}
                />
            </Tooltip >
            <IconButton aria-label="edit" onClick={handleClickOpen}>
                <EditIcon fontSize="small" />
            </IconButton>
            <Dialog open={editOpen} onClose={handleClose} fullWidth={true} maxWidth='md'>
                <DialogTitle id={'form-edit-' + props.name} align='left' gutterBottom>Edit '{props.label}'</DialogTitle>
                <DialogContent>
                    {backgroundFragments}
                    {instructionsFragment}
                    <DialogContentText variant='h5'>Processing comments</DialogContentText>
                    <TextField name='comments' onChange={handleValueChanges} margin="dense" id={'comments-field-' + props.name} label='Comments' fullWidth multiline value={values.comments} />
                </DialogContent>
                <DialogActions>
                    <Button id={'apply-filter-' + props.name} color="primary" startIcon={<FilterListIcon />} onClick={() => setApplyFilterBarOpen(true)}>
                        Apply filter
                    </Button>
                    <Snackbar open={applyFilterBarOpen} autoHideDuration={6000} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} onClose={handleFilterBarClose}>
                        <Alert onClose={handleFilterBarClose} severity="info">
                            Filter applied on document '...dlt'
                        </Alert>
                    </Snackbar>
                    <ButtonGroup>
                        <Button size="small" onClick={handleClose} color="primary" startIcon={<CheckBoxIcon />}>
                            mark as ok
                        </Button>
                        <Button size="small" onClick={handleClose} color="secondary" startIcon={<ErrorIcon />}>
                            mark as error
                        </Button>
                        <Button size="small" onClick={handleClose} color="primary" startIcon={<CheckBoxOutlineBlankIcon />}>
                            mark as unprocessed
                        </Button>
                    </ButtonGroup>
                    <Button onClick={handleClose} color="primary">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </Container >
    );
}

FBACheckbox.propTypes = {
    name: PropTypes.string.isRequired, // todo do we need the name? the label would be sufficient, or?
    label: PropTypes.string.isRequired,
    tooltip: PropTypes.string,
    onChange: PropTypes.func.isRequired // otherwise the option won't be stored
};
