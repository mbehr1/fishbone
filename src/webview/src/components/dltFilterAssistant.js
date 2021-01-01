// copyright (c) 2020 - 2021, Matthias Behr
import React, { useEffect, useState, useContext } from 'react';
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
import { makeStyles } from '@material-ui/styles';

import { AttributesContext } from './../App';
import { triggerRestQueryDetails, objectShallowEq } from './../util';

/* todos
- add manual filter entry
- finish support apply mode
- cache apply query rests (e.g. only on button press)
- disallow esc to close?
*/

const useStyles = makeStyles(theme => ({
    item: {
        padding: 0
    },
    icon: {
        'min-width': '24px'
    },
    checkbox: {
        padding: 0
    },
    text: {
        margin: 0
    }
}));


function not(a, b) {
    return a.filter((value) => b.indexOf(value) === -1);
}

function intersection(a, b) {
    return a.filter((value) => b.indexOf(value) !== -1);
}

function filterFromObj(obj, applyMode) {

    const typePrefix = (type) => {
        switch (type) {
            case 0: return '+';
            case 1: return '-';
            case 2: return '*';
            case 3: return '@';
            default: return `unknown(${type})`;
        }
    }

    return {
        name: `${typePrefix(obj.type)}${obj?.name?.length > 0 ? obj.name : JSON.stringify({ ...obj, type: undefined, tmpFb: undefined })}`,
        value: applyMode ?
            (obj.type !== 3 ? `add=${JSON.stringify({ ...obj, tmpFb: 1 })}` : `report=[${JSON.stringify({ ...obj, tmpFb: 1 })}]`) :
            JSON.stringify(obj) // todo for report multiple ones should be put into the same report -> same array. refactor logic!
    }
}

function parseFilters(request, applyMode) {
    if (!applyMode) {
        // parse a request string expecting the form:
        // ext:mbehr1.dlt-logs/get/.../filters?query=[]
        const indexOfQ = request?.indexOf('?query=[');
        const queryFilters = [];
        if (indexOfQ > 0) {
            const queryArray = request.slice(indexOfQ + 7);
            try {
                const qArrObj = JSON.parse(queryArray);
                console.log(`parseFilters got from '${queryArray}:'`, qArrObj);
                if (Array.isArray(qArrObj)) {
                    qArrObj.forEach((arrObj) => {
                        const newFilter = filterFromObj(arrObj);
                        queryFilters.push(newFilter);
                    });
                }
            } catch (e) {
                console.warn(`parseFilters parsing '${queryArray}' got e=${e}`);
            }
        }
        return queryFilters;
    } else {
        const commandList = [];
        // parse all params into sep. "filter commands like": 
        // /get/...filters?delete={}&enableAll=view&add={}&add={}...
        const indexOfQ = request?.indexOf('?');
        if (indexOfQ > 0) {
            const options = request.slice(indexOfQ + 1);
            const optionArr = options.split('&');
            for (const commandStr of optionArr) {
                const eqIdx = commandStr.indexOf('=');
                const command = commandStr.slice(0, eqIdx);
                const commandParams = commandStr.slice(eqIdx + 1);
                switch (command) {
                    case 'enableAll':
                    case 'disableAll':
                        commandList.push({ name: commandStr, value: commandStr });
                        break;
                    case 'add':
                        commandList.push(filterFromObj(JSON.parse(commandParams), true));
                        break;
                    case 'delete':
                        commandList.push({ name: commandStr, value: commandStr });
                        break;
                    case 'report':
                        const params = JSON.parse(commandParams);
                        if (Array.isArray(params)) {
                            for (let i = 0; i < params.length; ++i)
                                commandList.push(filterFromObj(params[i], true));
                        } // todo refactor for one report with multiple filters
                        break;
                    default:
                        commandList.push({ name: `unknown '${command}'`, value: commandStr });
                        break;
                }

            }
        }
        return commandList;
    }
}


/**
 * open a modal dialog to define DLT filter settings
 * @param {*} props (open, onChange, onClose, applyMode)
 */
export default function DLTFilterAssistantDialog(props) {

    console.log(`DLTFilterAssistantDialog(open=${props.open}, applyMode=${props.applyMode})`);

    const attributes = useContext(AttributesContext);
    
    const classes = useStyles();

    const [dataSource, setDataSource] = React.useState();

    const [filters, setFilters] = React.useState([]);

    const [checked, setChecked] = React.useState([]);
    const [left, setLeft] = React.useState([]);
    const [right, setRight] = React.useState([]);

    // preview all available filters with the list from opened dlt doc:
    const [loadAllFilters, setLoadAllFilters] = useState(0);

    useEffect(() => {
        setDataSource(props.dataSource);
        // parse filters:
        const parsedFilters = parseFilters(props.dataSource, props.applyMode);
        setFilters(parsedFilters);
        setLeft(parsedFilters.map((filter, index) => index));
        setRight([]);
        setLoadAllFilters(0);
    }, [props.dataSource, props.applyMode]);
    console.log(`DLTFilterAssistantDialog dataSource=${dataSource}`);

    useEffect(() => {
        if (props.open && !loadAllFilters) {
            const fetchdata = async () => {
                try {
                    setLoadAllFilters(1); // running
                    const res = await triggerRestQueryDetails({ source: 'ext:mbehr1.dlt-logs/get/docs/0/filters', jsonPath: '$.data[*]' }, attributes);
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
                                    if (attr.type === 0 || attr.type === 1 || attr.type === 2 || attr.type === 3) { // only pos,neg, marker and event filters
                                        if (!(attr?.atLoadTime)) { // ignore load time ones
                                            const enabled = attr?.enabled ? true : false;
                                            const newAttrs = { ...attr, configs: undefined, id: undefined, enabled: undefined }
                                            const newFilter = filterFromObj(newAttrs, props.applyMode);
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
    }, [props.open, loadAllFilters, filters, left, right, checked, props.applyMode, attributes]);


    useEffect(() => {
        const updateDataSource = (list) => {
            if (props.open && dataSource !== undefined) {
                console.log(`updateDataSource(dataSource=${dataSource} list=`, list);
                const indexOfQ = dataSource?.indexOf('?');
                const uri = indexOfQ > 0 ? dataSource.slice(0, indexOfQ) : dataSource;
                if (props.applyMode) {
                    let commands = list.map((idx) => { return `${filters[idx].value}`; }).join('&');
                    const newDataSource = uri + `?${commands}`;
                    if (newDataSource !== dataSource) {
                        setDataSource(newDataSource);
                        setPreviewBadgeStatus(0);
                    }
                } else { // !applyMode -> queryMode
                    // calc params newly based on left ones:    
                    let params = list.map((idx) => { return `${filters[idx].value}`; }).join(',');
                    const newDataSource = uri + `?query=[${params}]`;
                    if (newDataSource !== dataSource) {
                        setDataSource(newDataSource);
                        setPreviewBadgeStatus(0);
                    }
                }
            }
        }
        updateDataSource(left);
    }, [props.open, left, dataSource, filters, props.applyMode]);

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
                    const res = await triggerRestQueryDetails({ source: dataSource, jsonPath: '$.data[*]', conv: 'length:' }, attributes);
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
    }, [props.open, previewBadgeStatus, dataSource, previewBadgeError, attributes]);

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
        <Paper style={{ width: 400, height: 350, overflow: 'auto' }}>
            <List dense={true} disablePadding={true} component="div" role="list">
                {items.map((value) => {
                    const labelId = `transfer-list-item-${value}-label`;

                    return (
                        <ListItem classes={{ root: classes.item }} key={value} role="listitem" button onClick={handleToggle(value)} dense={true} disableGutters={true}>
                            <ListItemIcon classes={{ root: classes.icon }}>
                                <Checkbox
                                    classes={{ root: classes.checkbox }}
                                    checked={checked.indexOf(value) !== -1}
                                    tabIndex={-1}
                                    disableRipple
                                    size='small'
                                    inputProps={{ 'aria-labelledby': labelId }}
                                />
                            </ListItemIcon>
                            <ListItemText classes={{ root: classes.text }} id={labelId} primary={`${filters[value]?.name}`} />
                        </ListItem>
                    );
                })}
                <ListItem />
            </List>
        </Paper>
    );

    const leftChecked = intersection(checked, left);
    const rightChecked = intersection(checked, right);

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

    //console.log(`DltFilterAssistant render() filters=`, filters);
    //console.log(`DltFilterAssistant render() checked=`, checked);
    //console.log(`DltFilterAssistant render() left   =`, left);
    //console.log(`DltFilterAssistant render() right  =`, right);

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
    onClose: PropTypes.func.isRequired,
    applyMode: PropTypes.bool // default to false
};
