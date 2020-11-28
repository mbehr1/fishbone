// copyright (c) 2020, Matthias Behr
import React, { useEffect, useContext } from 'react';
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

import Input from '@material-ui/core/Input';

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
import { triggerRestQuery, triggerRestQueryDetails } from './../util';

import { AttributesContext } from './../App';
import DataProviderEditDialog from './dataProviderEditDialog';

// import Grid from '@material-ui/core/Grid';
// import Autocomplete from '@material-ui/lab/Autocomplete';
// import CircularProgress from '@material-ui/core/CircularProgress';
// import { sendAndReceiveMsg } from '../util';

// todo
// - make applyFilter a state to appear directly after editing.
// - allow to remove applyFilter (e.g. by source.length=0)
//  - use Chips instead of texts (allowing always to set the <DoneIcon />?)
// - highlight current selection with a different text. e.g. "keep as OK", ...
// - add id= to buttons...
// - use e.g. react-markdown to support markdown for background, desc, comments

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

export default function FBACheckbox(props) {

    const attributes = useContext(AttributesContext);
    //console.warn(`FBACheckbox attributes=${JSON.stringify(attributes, null, 2)}`);

    const [editOpen, setEditOpen] = React.useState(false);
    const [applyFilterBarOpen, setApplyFilterBarOpen] = React.useState(false);
    const [applyFilterResult, setApplyFilterResult] = React.useState('<not triggered yet>')

    // badge support (restquery in the background)
    const [badgeCounter, setBadgeCounter] = React.useState(0);
    const [badgeStatus, setBadgeStatus] = React.useState(0); // 0 not queried yet, 1 = pending, 2 = done badgeCounter set!

    // badge2 support (rest query in the background)
    const [badge2Counter, setBadge2Counter] = React.useState(0);
    const [badge2Status, setBadge2Status] = React.useState(0); // 0 not queried yet, 1 = pending, 2 = done badgeCounter set!

    // DataProviderEditDialog handling
    const [dpEditOpen, setDpEditOpen] = React.useState(0);

    // values that can be changed: (comments and value (ok/error...))
    //console.log(`FBACheckbox(props.label=${props.label}, props.comments=${props.comments})`);
    const [values, setValues] = React.useState({});
    // update value on props change: (e.g. if the comp. is visible already)
    useEffect(() => {
        setValues({
            'comments': props.comments,
            'value': props.value,
            'label': props.label,
            'instructions': props.instructions,
            'backgroundDescription': props.backgroundDescription,
            'badge': props.badge || props?.filter?.badge, // todo remove filter.badge and filter.badge2
            'badge2': props.badge2 || props?.filter?.badge2,
            'filter': props.filter
        });
        setApplyFilterBarOpen(false);
    }, [props]);

    //console.log(`FBACheckbox(values.label=${values.label}, values.comments=${values.comments})`);

    useEffect(() => {
        console.log(`FBACheckbox applyFilterBarOpen=${applyFilterBarOpen}`, props.filter);
        if (applyFilterBarOpen && props?.filter?.source?.length > 0) {
            setApplyFilterResult('filter settings triggered...');
            const fetchdata = async () => {
                try {
                    const res = await triggerRestQuery(props.filter.source);
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

    // if attributes change we do reset the badgestatus
    useEffect(() => {
        setBadgeStatus(0);
        setBadge2Status(0);
    }, [attributes]);

    // effect for badge processing:
    useEffect(() => {
        console.log(`FBACheckbox effect for badge processing called (badgeStatus=${badgeStatus}, badgeCounter='${badgeCounter}' badge=${JSON.stringify(values.badge)})`);
        if (!badgeStatus && values.badge?.source) {
            const fetchdata = async () => {
                try {
                    setBadgeStatus(1);
                    const res = await triggerRestQueryDetails(values.badge, attributes);
                    if ('result' in res) {
                        setBadgeCounter(res.result);
                        setBadgeStatus(2);
                    }
                } catch (e) {
                    console.warn(`FBACheckbox effect for badge processing got error '${e}'`);
                }
            };
            fetchdata();
        }
    }, [badgeStatus, badgeCounter, values.badge, attributes]); // todo and attribute status ecu/lifecycle... (to determine...)

    // effect for badge2 processing:
    useEffect(() => {
        console.log(`FBACheckbox effect for badge2 processing called (badge2Status=${badge2Status}, badge2Counter='${badge2Counter}' badge2=${JSON.stringify(values.badge2)})`);
        if (!badge2Status && values.badge2?.source) {
            const fetchdata = async () => {
                try {
                    setBadge2Status(1);
                    const res = await triggerRestQueryDetails(values.badge2, attributes);
                    if ('result' in res) {
                        setBadge2Counter(res.result);
                        setBadge2Status(2);
                    } else { 
                        setBadge2Counter(0);
                    }

                } catch (e) {
                    console.warn(`FBACheckbox effect for badge2 processing got error '${e}'`);
                }
            };
            fetchdata();
        }
    }, [badge2Status, badge2Counter, values.badge2, attributes]); // todo and attribute status ecu/lifecycle... (to determine...)


    const handleValueChanges = e => {
        console.log(`handleValueChanges e=`, e);
        const { name, value } = e.target;
        console.log(`handleValueChanges name=${name} value=`, value);
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
            (newValues.value !== props.value) ||
            (newValues.label !== props.label) ||
            (newValues.backgroundDescription !== props.backgroundDescription) ||
            (newValues.instructions !== props.instructions) ||
            (newValues.badge !== props.badge) ||
            (newValues.badge2 !== props.badge2) ||
            (newValues.filter !== props.filter)
        ) {
            props.onChange({ target: { type: 'textfield', values: newValues } });
        }
    };

    const handleFilterBarClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setApplyFilterBarOpen(false);
    }

    const backgroundFragments = (
        <React.Fragment>
            <DialogContentText paragraph>
                <TextField name='backgroundDescription' onChange={handleValueChanges} margin="dense" id={'backgroundDescription-field-' + props.name}
                    InputLabelProps={{ shrink: true, }} fullWidth multiline value={values.backgroundDescription}
                    label='Background'
                    placeholder='Please enter some background information on this root cause.' />
            </DialogContentText>
        </React.Fragment>
    );

    const instructionsFragment = (
        <React.Fragment>
            <DialogContentText paragraph>
                <TextField name='instructions' onChange={handleValueChanges} margin="dense" id={'instructions-field-' + props.name}
                    InputLabelProps={{ shrink: true, }} fullWidth multiline value={values.instructions}
                    label='Instructions'
                    placeholder='Please enter instructions here on how to check whether this root cause did occur.' />
            </DialogContentText>
        </React.Fragment>
    );

    // todo add tooltip...

    const handleApplyFilter = (request) => {
        setApplyFilterBarOpen(true)
    }

    const applyFilterFragment = (props.filter &&
        <React.Fragment>
        <Button id={'apply-filter-' + props.name} color="primary" startIcon={<FilterListIcon />} onClick={(e) => handleApplyFilter(props.filter)}>
                Apply filter
            </Button>
            <Snackbar open={applyFilterBarOpen} autoHideDuration={6000} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} onClose={handleFilterBarClose}>
                <Alert onClose={handleFilterBarClose} severity="info">
                    {applyFilterResult}
                </Alert>
            </Snackbar>
        </React.Fragment>
    );

    return (
        <Container>
            <Grid container spacing={1}>
                <Grid item flex>
                    <Badge badgeContent={badgeCounter} color="error" anchorOrigin={{ vertical: 'top', horizontal: 'left', }} overlap="circle" max={999} invisible={props.value !== null || badgeStatus < 2}>
                        <Badge badgeContent={badge2Counter} color="info" anchorOrigin={{ vertical: 'bottom', horizontal: 'right', }} overlap="circle" invisible={badge2Status < 2}>
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
                <DialogTitle disableTypography id={'form-edit-' + props.name} align='left' gutterBottom>
                    <Input id={'input-label'} name='label' value={values.label} onChange={handleValueChanges} ></Input>
                    <Button variant="outlined" size="small" startIcon={<EditIcon />} onClick={() => setDpEditOpen(1)}>
                        upper left badge
                    </Button>
                    <DataProviderEditDialog data={values.badge || {}} onChange={(newValue) => handleValueChanges({ target: { name: 'badge', value: newValue } })} open={dpEditOpen === 1} onClose={() => { setDpEditOpen(0); }} />
                    <Button variant="outlined" size="small" startIcon={<EditIcon />} onClick={() => setDpEditOpen(2)}>
                        lower right badge
                    </Button>
                    <DataProviderEditDialog data={values.badge2 || {}} onChange={(newValue) => handleValueChanges({ target: { name: 'badge2', value: newValue } })} open={dpEditOpen === 2} onClose={() => { setDpEditOpen(0); }} />
                    <Button variant="outlined" size="small" startIcon={<EditIcon />} onClick={() => setDpEditOpen(3)}>
                        apply filter
                    </Button>
                    <DataProviderEditDialog applyMode={true} data={values.filter || {}} onChange={(newValue) => handleValueChanges({ target: { name: 'filter', value: newValue } })} open={dpEditOpen === 3} onClose={() => { setDpEditOpen(0); }} />
                </DialogTitle>
                <DialogContent>
                    {backgroundFragments}
                    {instructionsFragment}
                    <TextField InputLabelProps={{ shrink: true, }}
                        name='comments'
                        placeholder='Please enter some processing comments here.'
                        onChange={handleValueChanges}
                        margin="dense"
                        variant="outlined"
                        id={'comments-field-' + props.name}
                        label='Processing comments'
                        fullWidth
                        multiline
                        value={values.comments} />
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
