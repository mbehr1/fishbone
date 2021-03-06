// copyright (c) 2020 - 2021, Matthias Behr
import React, { useContext, useEffect } from 'react';
import PropTypes from 'prop-types';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import { Button, DialogContent, DialogTitle, FormControl, IconButton, InputLabel, Typography } from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import EditIcon from '@material-ui/icons/Edit';
import FilterListIcon from '@material-ui/icons/FilterList';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import RadioGroup from '@material-ui/core/RadioGroup';
import Radio from '@material-ui/core/Radio';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Badge from '@material-ui/core/Badge';
import Input from '@material-ui/core/Input';
import OnBlurInputBase from './onBlurInputBase';
import DLTFilterAssistantDialog from './dltFilterAssistant';
import DLTRestQueryManualDialog from './dltRestQueryManual';

import { AttributesContext } from './../App';
import { triggerRestQueryDetails, numberAbbrev } from './../util';

/* todos
- add appy filter edit
- disallow esc to close?
*/

/**
 * open a modal dialog to edit dataprovider settings
 * @param {*} props (open, onChange, onClose)
 */
export default function DataProviderEditDialog(props) {

    console.log(`DataProviderEditDialog(open=${props.open})`);

    const attributes = useContext(AttributesContext);

    const [dataType, setDataType] = React.useState();
    const [dataSource, setDataSource] = React.useState();
    const [dataJsonPath, setDataJsonPath] = React.useState();
    const [dataConv, setDataConv] = React.useState('length:');

    useEffect(() => {
        setDataSource(props.data?.source);
        setDataJsonPath(props.data?.jsonPath);
        setDataConv(props.data?.conv ? props.data?.conv : (props.applyMode ? undefined : 'length:'))
        setDataType(props.data?.source?.startsWith("ext:mbehr1.dlt-logs") ? "ext:dlt" : "http")
    }, [props.data, props.applyMode]);

    // DLTFilterAssistantDialog handling
    const [dltFilterAssistantOpen, setDltFilterAssistantOpen] = React.useState(false);

    const [manualEditOpen, setManualEditOpen] = React.useState(false);

    const previewApplyText = props.applyMode ? 'Press "Test apply filter" button to start...' : '';

    // preview badge content
    const [previewBadgeContent, setPreviewBadgeContent] = React.useState();
    const [previewBadgeStatus, setPreviewBadgeStatus] = React.useState(props.applyMode ? 3 : 0);
    const [previewBadgeError, setPreviewBadgeError] = React.useState('');
    const [previewQueryResult, setPreviewQueryResult] = React.useState(previewApplyText);

    useEffect(() => {
        if (props.open && !previewBadgeStatus && dataSource) {
            console.log(`DLTFilterAssistant effect for badge processing called (badgeStatus=${previewBadgeStatus}, source=${JSON.stringify(dataSource)})`);
            const fetchdata = async () => {
                try {
                    setPreviewBadgeError('querying...');
                    setPreviewBadgeStatus(1);
                    const res = await triggerRestQueryDetails({ source: dataSource, jsonPath: dataJsonPath, conv: dataConv }, attributes);
                    if ('error' in res) { setPreviewBadgeError(res.error); } else { setPreviewBadgeError(''); }
                    let details = '';
                    if ('jsonPathResult' in res) { details += 'jsonPath results:\n' + JSON.stringify(res.jsonPathResult, null, 2); }
                    if ('restQueryResult' in res) { details += '\nrestQuery results:\n' + JSON.stringify(res.restQueryResult, null, 2); }
                    setPreviewQueryResult(details);
                    if ('result' in res) {
                        setPreviewBadgeContent(res.result);
                        setPreviewBadgeStatus(2);
                    }
                } catch (e) {
                    console.warn(`FBACheckbox effect for badge processing got error:`, e);
                    setPreviewBadgeError(e && e.errors && Array.isArray(e.errors) ? e.errors.join(' / ') : `unknown error:'${JSON.stringify(e)}'`);
                    setPreviewQueryResult('');
                }
            };
            fetchdata();
        }
    }, [props.open, previewBadgeStatus, dataSource, dataJsonPath, dataConv, previewBadgeError, attributes]);

    const handleClose = () => {

        props.onClose();
    }

    const handleSave = () => {
        console.log(`DataProviderEditDialog handleSave()`);
        console.log(` dataType=${dataType}`);
        console.log(` dataType=${dataSource}`);
        console.log(` dataJsonPath=${dataJsonPath}`);
        console.log(` dataConv=${dataConv}`);

        // if one differs from props.data call props.onChange
        if (typeof props.data === 'object') {
            if (dataSource !== props.data.source ||
                dataJsonPath !== props.data.jsonPath ||
                dataConv !== props.data.conv) {
                props.onChange({ ...props.data, source: dataSource, jsonPath: dataJsonPath, conv: dataConv });
            }
        }
        props.onClose();
    };

    return (
        <Dialog fullScreen open={props.open} onClose={handleClose}>
            <DialogTitle id="dpEditDialogTitle">
                {props.applyMode ? 'Edit appy filter settings...' : 'Edit badge and filter settings...'}
                <IconButton onClick={handleClose} color="inherit" style={{ position: 'absolute', right: 1 }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Grid container direction="column" justify="flex-start" alignItems="stretch" spacing={2}>
                    <Grid item>
                        <Paper>
                            <RadioGroup row value={dataType} onChange={(event) => setDataType(event.target.value)}>
                                <FormControlLabel value="http" control={<Radio size="small" color="primary" />} label={<Typography variant="body1">https rest query</Typography>} />
                                <FormControlLabel value="ext:dlt" control={<Radio size="small" color="primary" />} label="extension dlt-logs rest query" />
                            </RadioGroup>
                        </Paper>
                    </Grid>
                    <Grid item>
                        {dataType === 'http' && <Paper>
                            <FormControl variant="outlined" fullWidth margin="normal">
                                <InputLabel shrink color="primary" htmlFor="dataSourceInput">
                                    Enter https URL
                                </InputLabel>
                                <Input id="dataSourceInput" inputComponent={OnBlurInputBase}
                                    placeholder="e.g. 'https://api.github.com/repos/mbehr1/fishbone/issues'"
                                    inputProps={{ value: dataSource, onChange: (event) => { setPreviewQueryResult(previewApplyText); setPreviewBadgeStatus(props.applyMode ? 3 : 0); setDataSource(event.target.value); } }} />
                            </FormControl>
                        </Paper>}
                        {dataType === 'ext:dlt' && <Paper>
                            <Button size="small" color="primary" onClick={() => setDltFilterAssistantOpen(true)}>
                                Open DLT filter assistant...
                            </Button>
                            <Button startIcon={<EditIcon />} size="small" color="primary" style={{ 'margin-left': '5px' }} onClick={() => setManualEditOpen(true)}>
                                Edit manually...
                            </Button>
                            {dltFilterAssistantOpen && <DLTFilterAssistantDialog
                                applyMode={props.applyMode}
                                dataSource={dataSource?.startsWith('ext:mbehr1.dlt-logs') ? dataSource : (props.applyMode ?
                                    // eslint-disable-next-line no-template-curly-in-string
                                    `ext:mbehr1.dlt-logs/get/docs/0/filters?delete=${encodeURIComponent('{"tmpFb":1}')}&disableAll=view${attributes.findIndex(attr => attr.hasOwnProperty('lifecycles')) >= 0 ? `&add=${encodeURIComponent('{"lifecycles":"${attributes.lifecycles.id}","name":"not selected lifecycles","not":true,"tmpFb":1,"type":1}')}` : ''}` :
                                    // eslint-disable-next-line no-template-curly-in-string
                                    `ext:mbehr1.dlt-logs/get/docs/0/filters?query=${encodeURIComponent(`[{${attributes.findIndex(attr => attr.hasOwnProperty('lifecycles')) >= 0 ? '"lifecycles":"${attributes.lifecycles.id}",' : ''}"name":"not selected lifecycles","not":true,"type":1}]`)}`)}
                                onChange={(newValue) => { setDataSource(newValue); if (!dataJsonPath?.length) { setDataJsonPath('$.data[*]') } }}
                                open={dltFilterAssistantOpen}
                                onClose={() => setDltFilterAssistantOpen(false)}
                            />}
                            {manualEditOpen && <DLTRestQueryManualDialog
                                applyMode={props.applyMode}
                                dataSource={dataSource?.startsWith('ext:mbehr1.dlt-logs') ? dataSource : (props.applyMode ?
                                    // eslint-disable-next-line no-template-curly-in-string
                                    `ext:mbehr1.dlt-logs/get/docs/0/filters?delete=${encodeURIComponent('{"tmpFb":1}')}&disableAll=view${attributes.findIndex(attr => attr.hasOwnProperty('lifecycles')) >= 0 ? `&add=${encodeURIComponent('{"lifecycles":"${attributes.lifecycles.id}","name":"not selected lifecycles","not":true,"tmpFb":1,"type":1}')}` : ''}` :
                                    // eslint-disable-next-line no-template-curly-in-string
                                    `ext:mbehr1.dlt-logs/get/docs/0/filters?query=${encodeURIComponent(`[{${attributes.findIndex(attr => attr.hasOwnProperty('lifecycles')) >= 0 ? '"lifecycles":"${attributes.lifecycles.id}",' : ''}"name":"not selected lifecycles","not":true,"type":1}]`)}`)}
                                open={manualEditOpen}
                                onChange={(newValue) => { setPreviewQueryResult(previewApplyText); setPreviewBadgeStatus(props.applyMode ? 3 : 0); setDataSource(newValue); if (!dataJsonPath?.length) { setDataJsonPath('$.data[*]') } }}
                                onClose={() => setManualEditOpen(false)}
                            />}
                            <FormControl variant="outlined" color="primary" fullWidth margin="normal">
                                <InputLabel htmlFor="dataSourceInput" shrink color="primary">
                                    "Enter dlt-logs rest query"
                                </InputLabel>
                                <Input id="dataSourceInput" inputComponent={OnBlurInputBase}
                                    placeholder={props.applyMode ? "e.g. '/get/docs/0/filters?delete=(uriencode({...}))&add={...}'" : "e.g. '/get/docs/0/filters?query=...'"}
                                    inputProps={{ value: dataSource?.startsWith('ext:mbehr1.dlt-logs') ? dataSource.slice(19) : dataSource, onChange: (event) => { setPreviewQueryResult(previewApplyText); setPreviewBadgeStatus(props.applyMode ? 3 : 0); setDataSource('ext:mbehr1.dlt-logs' + event.target.value); } }} />
                            </FormControl>
                        </Paper>}
                        {!props.applyMode && <Paper>
                            <FormControl variant='outlined' fullWidth margin="normal">
                                <InputLabel shrink htmlFor="dataJsonPathInput">Enter jsonPath expression to extract results</InputLabel>
                                <Input id="dataJsonPathInput" inputComponent={OnBlurInputBase}
                                    placeholder="e.g. '$.state' or '$.data[*]"
                                    inputProps={{ value: dataJsonPath, onChange: (event) => { setPreviewQueryResult(previewApplyText); setPreviewBadgeStatus(props.applyMode ? 3 : 0); setDataJsonPath(event.target.value); } }}
                                />
                            </FormControl>
                            <RadioGroup row value={dataConv?.split(':')[0]} onChange={(event) => {
                                setPreviewQueryResult(previewApplyText);
                                setPreviewBadgeStatus(props.applyMode ? 3 : 0);
                                switch (event.target.value) {
                                    case 'index': setDataConv('index:0'); break;
                                    case 'length': setDataConv('length:'); break;
                                    case 'func': setDataConv('func:' + dataConv?.slice(dataConv.indexOf(':') + 1)); break;
                                    default: break;
                                }
                            }}>
                                <FormControlLabel value="length" control={<Radio size="small" color="primary" />} label="number of array elements" />
                                <FormControlLabel value="index" control={<Radio size="small" color="primary" />} label="first element" />
                                <FormControlLabel value="func" control={<Radio size="small" color="primary" />} label="javascript function" />
                            </RadioGroup>
                            {dataConv?.startsWith("func") &&
                                <FormControl variant="outlined" fullWidth margin="normal">
                                <InputLabel shrink htmlFor="dataFuncInput">javascript function body</InputLabel>
                                <Input id="dataFuncInput" inputComponent={OnBlurInputBase}
                                    placeholder="e.g. '{return result.message;}'"
                                    multiline
                                    inputProps={{ multiline: true, value: dataConv.slice(dataConv.indexOf(':') + 1), onChange: (event) => { setPreviewQueryResult(previewApplyText); setPreviewBadgeStatus(props.applyMode ? 3 : 0); setDataConv('func:' + event.target.value); } }}
                                />
                                </FormControl>
                            }
                        </Paper>}
                    </Grid>
                    {props.applyMode && <Grid item>
                        <Button id={'dp-test-apply-filter-' + props.name} color="secondary" startIcon={<FilterListIcon />}
                            disabled={!(previewBadgeStatus === 3 && dataSource?.length > 0)}
                            onClick={(e) => { if (previewBadgeStatus === 3 && dataSource?.length > 0) { setPreviewBadgeStatus(0); } }}>
                            Test "apply filter"
                        </Button>
                    </Grid>}
                    <Grid item>
                        <Paper>
                            {!props.applyMode && <Badge badgeContent={numberAbbrev(previewBadgeContent, 999)} color="error" anchorOrigin={{ vertical: 'top', horizontal: 'left', }} overlap="circle" max={NaN}>
                                badge content='{JSON.stringify(previewBadgeContent)}'
                            </Badge>}
                            <div>
                                badge error='{previewBadgeError}'
                                badge status='{previewBadgeStatus}'
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
                <Button size="small" autoFocus onClick={handleSave} color="primary">
                    Save changes
                </Button>
            </DialogActions>
        </Dialog>
    );
};

DataProviderEditDialog.propTypes = {
    data: PropTypes.object.isRequired,
    open: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired, // otherwise the option won't be stored
    onClose: PropTypes.func.isRequired,
    applyMode: PropTypes.bool
};
