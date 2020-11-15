// copyright (c) 2020, Matthias Behr
import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import Container from '@material-ui/core/Container';
import Grid from '@material-ui/core/Grid';
import ButtonGroup from '@material-ui/core/ButtonGroup';
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
import Badge from '@material-ui/core/Badge';
import MuiAlert from '@material-ui/lab/Alert';
import { Snackbar, TextField } from '@material-ui/core';
import MultiStateBox from './multiStateBox';
import { triggerRestQuery } from './../util';


// import Grid from '@material-ui/core/Grid';
// import Autocomplete from '@material-ui/lab/Autocomplete';
// import CircularProgress from '@material-ui/core/CircularProgress';
// import { sendAndReceiveMsg } from '../util';
import jp from 'jsonpath'

// todo
//  - use Chips instead of texts (allowing always to set the <DoneIcon />?)
// - highlight current selection with a different text. e.g. "keep as OK", ...
// - add id= to buttons...
// - use e.g. react-markdown to support markdown for background, desc, comments

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

export default function FBACheckbox(props) {

    const [editOpen, setEditOpen] = React.useState(false);
    const [applyFilterBarOpen, setApplyFilterBarOpen] = React.useState(false);
    const [applyFilterResult, setApplyFilterResult] = React.useState('<not triggered yet>')

    // badge support (restquery in the background)
    const [badgeCounter, setBadgeCounter] = React.useState(0);
    const [badgeStatus, setBadgeStatus] = React.useState(0); // 0 not queried yet, 1 = pending, 2 = done badgeCounter set!

    // badge2 support (rest query in the background)
    const [badge2Counter, setBadge2Counter] = React.useState(0);
    const [badge2Status, setBadge2Status] = React.useState(0); // 0 not queried yet, 1 = pending, 2 = done badgeCounter set!


    // values that can be changed: (comments and value (ok/error...))
    const [values, setValues] = React.useState({ 'comments': props.comments, 'value': props.value });

    useEffect(() => {
        console.log(`FBACheckbox applyFilterBarOpen=${applyFilterBarOpen}`, props.filter);
        if (applyFilterBarOpen && props.filter) {
            setApplyFilterResult('filter settings triggered...');
            const fetchdata = async () => {
                try {
                    const res = await triggerRestQuery(props.filter.apply);
                    console.log(`res=`, res);
                    setApplyFilterResult('filter settings applied');
                } catch (e) {
                    console.log(`e=`, e);
                    setApplyFilterResult('Failed to apply filter settings!');
                };
            };
            fetchdata();
        }
    }, [applyFilterBarOpen, props.filter]);

    // effect for badge processing:
    useEffect(() => {
        console.log(`FBACheckbox effect for badge processing called (badgeStatus=${badgeStatus}, filter.badge=${JSON.stringify(props?.filter?.badge)})`);
        if (!badgeStatus && props?.filter?.badge?.source) {
            const fetchdata = async () => {
                try {
                    setBadgeStatus(1);
                    const res = await triggerRestQuery(props.filter.badge.source);
                    console.log(`FBACheckbox effect for badge processing got res '${JSON.stringify(res)}'`);
                    // do we have a jsonPath?
                    if (props.filter.badge.jsonPath) {
                        const data = jp.query(res.data, props.filter.badge.jsonPath);
                        console.log(`jsonPath('${props.filter.badge.jsonPath}') returned '${JSON.stringify(data)}' size==${Array.isArray(data) ? data.length : 0}`);
                        setBadgeCounter(Array.isArray(data) ? data.length : 0);
                    } else {
                        // todo...?
                        setBadgeCounter(0);
                    }

                    setBadgeStatus(2);
                } catch (e) {
                    console.warn(`FBACheckbox effect for badge processing got error '${e}'`);
                }
            };
            fetchdata();
        }
    }, [badgeStatus, props?.filter?.badge]); // todo and attribute status ecu/lifecycle... (to determine...)

    // effect for badge2 processing:
    useEffect(() => {
        console.log(`FBACheckbox effect for badge2 processing called (badgeStatus=${badge2Status}, filter.badge=${JSON.stringify(props?.filter?.badge2)})`);
        if (!badge2Status && props?.filter?.badge2?.source) {
            const fetchdata = async () => {
                try {
                    setBadgeStatus(1);
                    const res = await triggerRestQuery(props.filter.badge2.source);
                    console.log(`FBACheckbox effect for badge2 processing got res '${JSON.stringify(res)}'`);
                    // do we have a jsonPath?
                    if (props.filter.badge2.jsonPath) {
                        const data = jp.query(res, props.filter.badge2.jsonPath); // todo... .data?
                        console.log(`jsonPath('${props.filter.badge2.jsonPath}') returned '${JSON.stringify(data)}' size==${Array.isArray(data) ? data.length : 0}`);

                        // determine the data:
                        // if its an array and the one and only array element is a string -> use as string
                        // if its an array -> use nr of array elements
                        // its a string -> use as string
                        let counterValue = undefined;
                        if (Array.isArray(data)) {
                            if (data.length === 1 && typeof (data[0]) === 'string') { counterValue = data[0] } else {
                                counterValue = data.length;
                            }
                        } else {
                            if (typeof data === 'string') { counterValue = data; } else { counterValue = 0; }
                        }

                        setBadge2Counter(counterValue); // todo same logic for badge(1)
                    } else {
                        // todo...?
                    }
                    setBadge2Status(2);
                } catch (e) {
                    console.warn(`FBACheckbox effect for badge2 processing got error '${e}'`);
                }
            };
            fetchdata();
        }
    }, [badge2Status, props?.filter?.badge2]); // todo and attribute status ecu/lifecycle... (to determine...)


    const handleValueChanges = e => {
        const { name, value } = e.target;
        setValues({ ...values, [name]: value })
    }

    const handleClickOpen = () => {
        setEditOpen(true);
    };

    const handleClose = (partValues) => {
        console.log(`handleClose values=`, values);
        console.log(`handleClose props=`, props);
        console.log(`handleClose partValues=`, partValues);
        setEditOpen(false);
        let newValues = { ...values };
        if (partValues) {
            newValues = { ...values, value: partValues.value };
            console.log(`handleClose newValues=`, newValues);
            setValues(newValues);
            console.log(`handleClose values=`, values);
            // todo investigate. I still dont understand the useState hooks...
            // values here is still unchanged...
        }
        // update values... todo (event) => props.onChange(event, 'comments')
        if ((newValues.comments !== props.comments) ||
            (newValues.value !== props.value)) {
            props.onChange({ target: { type: 'textfield', values: newValues } });
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

    // todo add tooltip...

    const handleApplyFilter = (request) => {
        setApplyFilterBarOpen(true)
    }

    const applyFilterFragment = props.filter ? (
        <React.Fragment>
            <Button id={'apply-filter-' + props.name} color="primary" startIcon={<FilterListIcon />} onClick={(e) => handleApplyFilter(props.filter.apply)}>
                Apply filter
            </Button>
            <Snackbar open={applyFilterBarOpen} autoHideDuration={6000} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} onClose={handleFilterBarClose}>
                <Alert onClose={handleFilterBarClose} severity="info">
                    {applyFilterResult}
                </Alert>
            </Snackbar>
        </React.Fragment>
    ) : null; // todo or an "disable button to tease the feature!"

    return (
        <Container>
            <Grid container spacing={1}>
                <Grid item flex>
            <Badge badgeContent={badgeCounter} color="error" anchorOrigin={{ vertical: 'top', horizontal: 'left', }} overlap="circle" max={999} invisible={props.value !== null || !props?.filter?.badge || badgeStatus < 2}>
                <Badge badgeContent={badge2Counter} color="info" anchorOrigin={{ vertical: 'bottom', horizontal: 'right', }} overlap="circle" invisible={!props?.filter?.badge2 || badge2Status < 2}>
                    <MultiStateBox values={[{ value: null, icon: <CheckBoxOutlineBlankIcon fontSize="small" /> }, { value: 'ok', icon: <CheckBoxIcon fontSize="small" /> }, { value: 'error', icon: <ErrorIcon fontSize="small" />, color: 'secondary' }]} {...props} size="small" color="primary" />
                </Badge>
            </Badge>
                </Grid>
                <Grid style={{ 'max-width': 26 }}>
            <IconButton size="small" aria-label="edit" onClick={handleClickOpen}>
                <EditIcon fontSize="small" color="primary" />
            </IconButton>
                </Grid>
            </Grid>
            <Dialog open={editOpen} onClose={() => handleClose()} fullWidth={true} maxWidth='md'>
                <DialogTitle id={'form-edit-' + props.name} align='left' gutterBottom>Edit '{props.label}'</DialogTitle>
                <DialogContent>
                    {backgroundFragments}
                    {instructionsFragment}
                    <DialogContentText variant='h5'>Processing comments</DialogContentText>
                    <TextField name='comments' onChange={handleValueChanges} margin="dense" id={'comments-field-' + props.name} label='Comments' fullWidth multiline value={values.comments} />
                </DialogContent>
                <DialogActions>
                    {applyFilterFragment}
                    <ButtonGroup>
                        <Button size="small" onClick={() => { handleClose({ value: 'ok' }); }} color="primary" startIcon={<CheckBoxIcon />}>
                            {values.value === 'ok' ? 'keep as OK' : 'mark as OK'}
                        </Button>
                        <Button size="small" onClick={() => { handleClose({ value: 'error' }); }} color="secondary" startIcon={<ErrorIcon />}>
                            {values.value === 'error' ? 'keep as ERROR' : 'mark as ERROR'}
                        </Button>
                        <Button size="small" onClick={() => { handleClose({ value: null }); }} color="primary" startIcon={<CheckBoxOutlineBlankIcon />}>
                            {!values.value ? 'keep as unprocessed' : 'mark as unprocessed'}   
                        </Button>
                    </ButtonGroup>
                    <Button onClick={() => handleClose()} color="primary">
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
