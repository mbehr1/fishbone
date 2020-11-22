// copyright (c) 2020, Matthias Behr
import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import { Button, DialogContent, DialogTitle, IconButton } from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import Checkbox from '@material-ui/core/Checkbox';
import Badge from '@material-ui/core/Badge';

import { triggerRestQueryDetails, objectShallowEq } from './../util';

/* todos
- add manual filter entry
- support apply mode
- disallow esc to close?
*/

function not(a, b) {
    return a.filter((value) => b.indexOf(value) === -1);
}

function intersection(a, b) {
    return a.filter((value) => b.indexOf(value) !== -1);
}

function filterFromObj(obj) {
    return {
        name: `${obj.type === 0 ? '+' : '-'}${JSON.stringify({ ...obj, type: undefined })}`,
        value: JSON.stringify(obj)
    }
}

function parseFilters(request) {
    // parse a request string expecting the form:
    // ext:mbehr1.dlt-logs/get/.../filters?query=[]
    const indexOfQ = request?.indexOf('?query=[');
    const queryFilters = [];
    if (indexOfQ > 0) {
        const queryArray = request.slice(indexOfQ + 7);
        const qArrObj = JSON.parse(queryArray);
        console.log(`parseFilters got from '${queryArray}:'`, qArrObj);
        if (Array.isArray(qArrObj)) {
            qArrObj.forEach((arrObj) => {
                const newFilter = filterFromObj(arrObj);
                queryFilters.push(newFilter);
            });
        }
    }
    return queryFilters;
}


/**
 * open a modal dialog to define DLT filter settings
 * @param {*} props (open, onChange, onClose)
 */
export default function DLTFilterAssistantDialog(props) {

    console.log(`DLTFilterAssistantDialog(open=${props.open})`);

    const [dataSource, setDataSource] = React.useState();

    const [filters, setFilters] = React.useState([]);
        /* {
            name: "delete all temporary filters",
            value: 'delete={"fishbone":"temp"}'
        },
        {
            name: "disable all view filters",
            value: 'disableAll=view'
        }
    ]);*/

    const [checked, setChecked] = React.useState([]);
    const [left, setLeft] = React.useState([]);
    const [right, setRight] = React.useState([]);
    const leftChecked = intersection(checked, left);
    const rightChecked = intersection(checked, right);

    useEffect(() => {
        setDataSource(props.dataSource);
        // parse filters:
        const queryFilters = parseFilters(props.dataSource);
        setFilters(queryFilters);
        setLeft(queryFilters.map((filter, index) => index));
    }, [props.dataSource]);
    console.log(`DLTFilterAssistantDialog dataSource=${dataSource}`);


    // preview all available filters with the list from opened dlt doc:
    const [loadAllFilters, setLoadAllFilters] = useState(0);

    useEffect(() => {
        if (props.open && !loadAllFilters) {
            const fetchdata = async () => {
                try {
                    setLoadAllFilters(1); // running
                    const res = await triggerRestQueryDetails({ source: 'ext:mbehr1.dlt-logs/get/docs/0/filters', jsonPath: '$.data[*]' });
                    if ('result' in res) {
                        console.log(`got res.result=`, res.result);
                        if (Array.isArray(res.result)) {
                            const newFilters = [...filters];
                            const newLeft = [...left];
                            const newRight = [...right];
                            const newChecked = [...checked];
                            res.result.forEach((filter) => {
                                if (filter.type === 'filter') {
                                    const attr = filter.attributes;
                                    if (attr.type === 0 || attr.type === 1) { // only pos and neg filters // todo? markers are nice as well
                                        if (!(attr?.atLoadTime)) { // ignore load time ones
                                            const enabled = attr?.enabled ? true : false;
                                            const newAttrs = { ...attr, configs: undefined, id: undefined, enabled: undefined }
                                            const newFilter = filterFromObj(newAttrs);
                                            // does it exist already?
                                            const curIdx = filters.findIndex(filter => objectShallowEq(newFilter, filter));
                                            if (curIdx < 0) {
                                                newFilters.push(newFilter);
                                                if (enabled) {
                                                    newChecked.push(newFilters.length - 1);
                                                }
                                                newRight.push(newFilters.length - 1);
                                            }
                                        }
                                    }
                                }
                            });
                            setFilters(newFilters);
                            setLeft(newLeft);
                            setRight(newRight);
                            setChecked(newChecked);
                        }
                        setLoadAllFilters(2); // done
                    }
                } catch (e) {
                    console.warn(`DLTFilterAssistantDialog loadAllFilters effect got error:`, e);
                }
            };
            fetchdata();
        }
    }, [props.open, loadAllFilters, filters, left, right, checked]);


    useEffect(() => {
        const updateDataSource = (list) => {
            if (dataSource !== undefined) {
                console.log(`updateDataSource(dataSource=${dataSource} list=`, list);
                const indexOfQ = dataSource?.indexOf('?');
                const uri = indexOfQ > 0 ? dataSource.slice(0, indexOfQ) : dataSource;
                // calc params newly based on left ones:    
                let params = list.map((idx) => { return `${filters[idx].value}`; }).join(',');
                const newDataSource = uri + `?query=[${params}]`;
                if (newDataSource !== dataSource) {
                    setDataSource(newDataSource); // todo query or apply as parameter
                    setPreviewBadgeStatus(0);
                }
            }
        }
        updateDataSource(left);
    }, [left, dataSource, filters]);

    // preview badge content
    const [previewBadgeContent, setPreviewBadgeContent] = React.useState();
    const [previewBadgeStatus, setPreviewBadgeStatus] = React.useState(0);
    const [previewBadgeError, setPreviewBadgeError] = React.useState('');
    const [previewQueryResult, setPreviewQueryResult] = React.useState('');

    useEffect(() => {
        console.log(`DLTFilterAssistantDialog effect for badge processing called (badgeStatus=${previewBadgeStatus}, dataSource=${dataSource})`);
        if (props.open && !previewBadgeStatus && dataSource?.length > 0) {
            const fetchdata = async () => {
                try {
                    setPreviewBadgeError('querying...');
                    setPreviewBadgeStatus(1);
                    const res = await triggerRestQueryDetails({ source: dataSource, jsonPath: '$.data[*]', conv: 'length:' });
                    if ('error' in res) { setPreviewBadgeError(res.error); } else { setPreviewBadgeError(''); }
                    let details = '';
                    if ('jsonPathResult' in res) { details += 'jsonPath results:\n' + JSON.stringify(res.jsonPathResult, null, 2); }
                    if ('restQueryResult' in res) { details += '\nrestQuery results:\n' + JSON.stringify(res.restQueryResult, null, 2); }
                    setPreviewQueryResult(details);
                    if ('result' in res) {
                        setPreviewBadgeContent(JSON.stringify(res.result).slice(0, 20));
                        setPreviewBadgeStatus(2);
                    }
                } catch (e) {
                    console.warn(`DLTFilterAssistantDialog effect got error:`, e);
                    setPreviewBadgeError(e && e.errors && Array.isArray(e.errors) ? e.errors.join(' / ') : `unknown error:'${JSON.stringify(e)}'`);
                    setPreviewQueryResult('');
                }
            };
            fetchdata();
        }
    }, [props.open, previewBadgeStatus, dataSource, previewBadgeError]);

    const handleClose = () => {
        props.onClose();
    }

    const handleSave = () => {
        console.log(`DLTFilterAssistantDialog handleSave()`);
        console.log(` dataSource=${dataSource}`);

        // if one differs from props.data call props.onChange
        if (dataSource !== props.dataSource) {
            props.onChange(dataSource);
        }
        props.onClose();
    };

    const handleToggle = (value) => () => {
        const currentIndex = checked.indexOf(value);
        const newChecked = [...checked];

        if (currentIndex === -1) {
            newChecked.push(value);
        } else {
            newChecked.splice(currentIndex, 1);
        }
        setChecked(newChecked);
    }

    const customList = (items) => (
        <Paper style={{ width: 300, height: 350, overflow: 'auto' }}>
            <List dense component="div" role="list">
                {items.map((value) => {
                    const labelId = `transfer-list-item-${value}-label`;

                    return (
                        <ListItem key={value} role="listitem" button onClick={handleToggle(value)}>
                            <ListItemIcon>
                                <Checkbox
                                    checked={checked.indexOf(value) !== -1}
                                    tabIndex={-1}
                                    disableRipple
                                    inputProps={{ 'aria-labelledby': labelId }}
                                />
                            </ListItemIcon>
                            <ListItemText id={labelId} primary={`${filters[value]?.name}`} />
                        </ListItem>
                    );
                })}
                <ListItem />
            </List>
        </Paper>
    );



    const handleCheckedRight = () => {
        setRight(right.concat(leftChecked));
        setLeft(not(left, leftChecked));
        setChecked(not(checked, leftChecked));
    }

    const handleCheckedLeft = () => {
        setLeft(left.concat(rightChecked));
        setRight(not(right, rightChecked));
        setChecked(not(checked, rightChecked));
    }

    return (
        <Dialog fullScreen open={props.open} onClose={handleClose}>
            <DialogTitle id="dltFilterAssistantDialogTitle">
                DLT filter assistant...
                <IconButton onClick={handleClose} color="primary" style={{ position: 'absolute', right: 1 }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Grid container direction="column" justify="flex-start" alignItems="stretch" spacing={2}>
                    <Grid item>
                        <Grid container spacing={2} justify="flex-start" alignItems="center">
                            <Grid item>
                                Selected filters:
                                {customList(left)}
                            </Grid>
                            <Grid item>
                                <Grid container direction="column" alignItems="center">
                                    <Button variant="outlined" size="small" onClick={handleCheckedRight} disabled={leftChecked.length === 0}>&gt;</Button>
                                    <Button variant="outlined" size="small" onClick={handleCheckedLeft} disabled={rightChecked.length === 0}>&lt;</Button>
                                </Grid>
                            </Grid>
                            <Grid item>
                                All available filters:
                                {customList(right)}
                            </Grid>
                        </Grid>
                    </Grid>
                    <Grid item>
                        source: '{dataSource}'
                    </Grid>
                    <Grid item>
                        <Paper>
                            <Badge badgeContent={previewBadgeContent} color="error" anchorOrigin={{ vertical: 'top', horizontal: 'left', }} overlap="circle" max={999}>
                                badge content='{JSON.stringify(previewBadgeContent)}'
                            </Badge>
                            <div>
                                badge error='{JSON.stringify(previewBadgeError)}'
                                badge status='{JSON.stringify(previewBadgeStatus)}'
                            </div>
                            <div>
                                <pre style={{ display: 'block' }}>
                                    {previewQueryResult}
                                </pre>
                            </div>
                        </Paper>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button autoFocus onClick={handleSave} color="primary">
                    Save changes
                </Button>
            </DialogActions>
        </Dialog>
    );
};

DLTFilterAssistantDialog.propTypes = {
    dataSource: PropTypes.string.isRequired,
    open: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired, // otherwise the option won't be stored
    onClose: PropTypes.func.isRequired
};
