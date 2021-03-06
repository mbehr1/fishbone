// copyright (c) 2020 - 2021, Matthias Behr
import React, { useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import Container from '@material-ui/core/Container';
import Box from '@material-ui/core/Box';
import Grid from '@material-ui/core/Grid';
import ButtonGroup from '@material-ui/core/ButtonGroup';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import EditIcon from '@material-ui/icons/Edit';
import FilterListIcon from '@material-ui/icons/FilterList';
import CheckBoxIcon from '@material-ui/icons/CheckBox';
import CheckBoxOutlineBlankIcon from '@material-ui/icons/CheckBoxOutlineBlank';

import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

import ErrorIcon from '@material-ui/icons/Error';

import Input from '@material-ui/core/Input';

import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import Button from '@material-ui/core/Button';
import Badge from '@material-ui/core/Badge';
import MuiAlert from '@material-ui/lab/Alert';
import { Snackbar } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';

import { triggerRestQueryDetails, numberAbbrev } from './../util';
import { AttributesContext } from './../App';

import { GetMarkdownActive, GetTextValue, RenderConditionText } from './utils/markdown'

import MultiStateBox from './multiStateBox';
import DataProviderEditDialog from './dataProviderEditDialog';
import TextFieldEditDialog from './textFieldEditDialog';
var stableStringify = require('json-stable-stringify');

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
// - add tooltips 

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}


const useStyles = makeStyles(theme => ({
    upperLeftBadge: {
        left: `2px`, // was 0px orig
        transform: `scale(0.8) translate(0%, -65%)` // was scale(1) tranlate(-50%, -50%) orig. but we prefer them left aligned
    },
    lowerRightBadge: {
        'justify-content': 'flex-end', // right align text
        width: '115%', // as we move it to the right we can use more space
        right: '-5px', // text starting right aligned a -5px over the border but not overlapping the ... button (z-index issues)
        transform: 'scale(0.8) translate(0%, 70%)' // text a bit smaller and below
    }
}));

export default function FBACheckbox(props) {

    const attributes = useContext(AttributesContext);
    //console.warn(`FBACheckbox attributes=${JSON.stringify(attributes, null, 2)}`);

    const classes = useStyles();

    const [editOpen, setEditOpen] = React.useState(false);
    const [applyFilterBarOpen, setApplyFilterBarOpen] = React.useState(false);
    const [doApplyFilter, setDoApplyFilter] = React.useState(false);
    const [applyFilterResult, setApplyFilterResult] = React.useState('<not triggered yet>')

    // badge support (restquery in the background)
    const [badgeCounter, setBadgeCounter] = React.useState(0);
    const [badgeStatus, setBadgeStatus] = React.useState(0); // 0 not queried yet, 1 = pending, 2 = done badgeCounter set!
    const [badgeQuery, setBadgeQuery] = React.useState(stableStringify(props.badge)); // cached last request query

    // badge2 support (rest query in the background)
    const [badge2Counter, setBadge2Counter] = React.useState(0);
    const [badge2Status, setBadge2Status] = React.useState(0);
    const [badge2Query, setBadge2Query] = React.useState(stableStringify(props.badge2));

    // DataProviderEditDialog handling
    const [dpEditOpen, setDpEditOpen] = React.useState(0);

    // TextFieldEditDialog handling
    const [textFieldEditOpen, setTextFieldEditOpen] = React.useState(0);

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
            'badge': props.badge,
            'badge2': props.badge2,
            'filter': props.filter
        });
        setApplyFilterBarOpen(false);
        setDoApplyFilter(false);
    }, [props]);

    //console.log(`FBACheckbox(values.label=${values.label}, values.comments=${values.comments})`);

    useEffect(() => {
        if (doApplyFilter && values?.filter?.source?.length > 0) {
            console.log(`FBACheckbox doApplyFilter=${doApplyFilter}`, values.filter);
            setApplyFilterResult('filter settings triggered...');
            setDoApplyFilter(false);
            setApplyFilterBarOpen(true);
            const fetchdata = async () => {
                try {
                    const res = await triggerRestQueryDetails({ source: values.filter.source }, attributes);
                    console.log(`res=`, res);
                    setApplyFilterResult('filter settings applied');
                } catch (e) {
                    console.log(`e=`, e);
                    setApplyFilterResult('Failed to apply filter settings!');
                };
            };
            fetchdata();
        }
    }, [doApplyFilter, values.filter, attributes]);

    // if attributes change we do reset the badgestatus
    useEffect(() => {
        // todo we might further optimize and check whether the queries contain the attributes for http...
        setBadgeStatus(0);
        setBadge2Status(0);
    }, [attributes]);

    // effect for badge processing:
    useEffect(() => {
        const bs = stableStringify(values.badge);
        console.log(`FBACheckbox effect for badge processing called (badgeStatus=${badgeStatus}, badgeCounter='${badgeCounter}' badge=${bs})`);
        if ((!badgeStatus && values.badge?.source) ||
            (badgeStatus > 0 && badgeQuery !== bs)) {
            const fetchdata = async () => {
                try {
                    setBadgeStatus(1);
                    setBadgeQuery(bs);
                    const res = await triggerRestQueryDetails(values.badge, attributes);
                    if ('result' in res) {
                        // console.warn(`FBACheckbox effect for badge processing got res.result '${JSON.stringify(res.result)}'`);
                        setBadgeCounter(res.result); // todo or same here as for badge2? (dont show errors)
                        setBadgeStatus(2);
                    }
                } catch (e) {
                    console.warn(`FBACheckbox effect for badge processing got error '${e}'`);
                }
            };
            fetchdata();
        }
    }, [badgeStatus, badgeQuery, badgeCounter, values.badge, attributes]);

    // effect for badge2 processing:
    useEffect(() => {
        const b2s = stableStringify(values.badge2);
        console.log(`FBACheckbox effect for badge2 processing called (badge2Status=${badge2Status}, badge2Counter='${badge2Counter}' badge2=${b2s})`);
        if ((badge2Status === 0 && values.badge2?.source) ||
            (badge2Status > 0 && badge2Query !== b2s)) {
            const fetchdata = async () => {
                try {
                    setBadge2Status(1);
                    setBadge2Query(b2s);
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
    }, [badge2Status, badge2Query, badge2Counter, values.badge2, attributes]);

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
        } else {
            console.warn(`FBACheckbox.handleClose no changes! newValues.filter=${JSON.stringify(newValues.filter)} vs ${JSON.stringify(props.filter)}`);
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
            <Accordion defaultExpanded >
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    id="backgroundDescription-textfield-header">
                    <Typography gutterBottom variant="h6">Background</Typography>
                    <IconButton color="primary" size="small" aria-label="edit" onClick={(event) => { event.stopPropagation(); setTextFieldEditOpen(1); }} >
                        <EditIcon fontSize="small" />
                    </IconButton>
                </AccordionSummary>
                <AccordionDetails>
                    <TextFieldEditDialog
                        label='Background'
                        placeholder='Please enter some background information on this root cause.'
                        data={values.backgroundDescription || {}} onChange={(newValue) => handleValueChanges({ target: { name: 'backgroundDescription', value: newValue } })} open={textFieldEditOpen === 1} onClose={() => { setTextFieldEditOpen(0); }}
                    />
                    <RenderConditionText markdownActive={GetMarkdownActive(values.backgroundDescription)} text={GetTextValue(values.backgroundDescription)} />
                </AccordionDetails>
            </Accordion>
        </React.Fragment>
    );

    const instructionsFragment = (
        <React.Fragment>
            <Accordion defaultExpanded >
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    id="instructions-textfield-header">
                    <Typography gutterBottom variant="h6">Instructions</Typography>
                    <IconButton color="primary" size="small" aria-label="edit" onClick={(event) => { event.stopPropagation(); setTextFieldEditOpen(2); }} >
                        <EditIcon fontSize="small" />
                    </IconButton>
                </AccordionSummary>
                <AccordionDetails>
                    <TextFieldEditDialog
                        label='Instructions'
                        placeholder='Please enter instructions here on how to check whether this root cause did occur.'
                        data={values.instructions || {}} onChange={(newValue) => handleValueChanges({ target: { name: 'instructions', value: newValue } })} open={textFieldEditOpen === 2} onClose={() => { setTextFieldEditOpen(0); }}
                    />
                    <RenderConditionText markdownActive={GetMarkdownActive(values.instructions)} text={GetTextValue(values.instructions)} />
                </AccordionDetails>
            </Accordion>
        </React.Fragment>
    );

    const processingCommentsFragment = (
        <React.Fragment>
            <Accordion defaultExpanded >
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    id="background-textfield-header">
                    <Typography gutterBottom variant="h6">Comments</Typography>
                    <IconButton color="primary" size="small" aria-label="edit" onClick={(event) => { event.stopPropagation(); setTextFieldEditOpen(3); }} >
                        <EditIcon fontSize="small" />
                    </IconButton>
                </AccordionSummary>
                <AccordionDetails>
                    <TextFieldEditDialog
                        label='Processing comments'
                        placeholder='Please enter some processing comments here.'
                        data={values.comments || {}} onChange={(newValue) => handleValueChanges({ target: { name: 'comments', value: newValue } })} open={textFieldEditOpen === 3} onClose={() => { setTextFieldEditOpen(0); }}
                    />
                    <RenderConditionText markdownActive={GetMarkdownActive(values.comments)} text={GetTextValue(values.comments)} />
                </AccordionDetails>
            </Accordion>
        </React.Fragment>
    );

    const handleApplyFilter = (request) => {
        setDoApplyFilter(true);
    }

    const applyFilterFragment = (values.filter &&
        <React.Fragment>
        <Button id={'apply-filter-' + props.name} size="small" color="secondary" startIcon={<FilterListIcon />} onClick={(e) => handleApplyFilter(values.filter)}>
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
        <Container style={{ padding: '0px 0px 0px 10px' } /* a little padding left */}>
            <Box py='1px' /* py = padding-top+bottom <- padding around checkbox */>
                <Grid container spacing={1} /* distance between checkbox and edit icon */ >
                    <Grid item flex style={{ 'padding': '1px' }}>
                        <Badge classes={{ badge: classes.upperLeftBadge }} badgeContent={numberAbbrev(badgeCounter, 999)} color="error" anchorOrigin={{ vertical: 'top', horizontal: 'left', }} overlap="circle" max={NaN} invisible={values.value === 'ok' || badgeStatus < 2 || (typeof badgeCounter === 'number' && badgeCounter === 0)}>
                            <Badge classes={{ badge: classes.lowerRightBadge }} badgeContent={numberAbbrev(badge2Counter, 99)} max={NaN} color={/* doesn't exist for badge but makes the background inherit */"info"} anchorOrigin={{ vertical: 'bottom', horizontal: 'right', }} overlap="circle" invisible={values.value === 'ok' || badge2Status < 2} >
                                <MultiStateBox values={[{ value: null, icon: <CheckBoxOutlineBlankIcon fontSize="small" /> }, { value: 'ok', icon: <CheckBoxIcon fontSize="small" /> }, { value: 'error', icon: <ErrorIcon fontSize="small" style={{ color: '#f44336' }} /> }]} {...props} size="small" color="primary" />
                        </Badge>
                    </Badge>
                </Grid>
                    <Grid>
                        <IconButton color="primary" size="small" aria-label="edit" onClick={handleClickOpen} style={{ 'padding': '4px 0px 2px 0px' }}>
                            <EditIcon fontSize="small" />
                        </IconButton>
                </Grid>
            </Grid>
            </Box>
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
                    {processingCommentsFragment}
                </DialogContent>
                <DialogActions>
                    {applyFilterFragment}
                    <ButtonGroup color="primary" size="small" variant="outlined">
                        <Button onClick={() => { handleClose({ value: 'ok' }); }} color="primary" startIcon={<CheckBoxIcon />}>
                            {values.value === 'ok' ? 'keep as OK' : 'mark as OK'}
                        </Button>
                        <Button onClick={() => { handleClose({ value: 'error' }); }} color="primary" startIcon={<ErrorIcon color='error' />}>
                            {values.value === 'error' ? 'keep as ERROR' : 'mark as ERROR'}
                        </Button>
                        <Button onClick={() => { handleClose({ value: null }); }} color="primary" startIcon={<CheckBoxOutlineBlankIcon />}>
                            {!values.value ? 'keep as unprocessed' : 'mark as unprocessed'}
                        </Button>
                    </ButtonGroup>
                    <Button size="small" onClick={() => handleClose()} color="primary">
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
