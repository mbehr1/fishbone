// copyright (c) 2020 - 2021, Matthias Behr
import React, { useContext, useEffect } from 'react';
import PropTypes from 'prop-types';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import { Button, DialogContent, DialogTitle, FormControl, IconButton, InputLabel, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import FilterListIcon from '@mui/icons-material/FilterList';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import RadioGroup from '@mui/material/RadioGroup';
import Radio from '@mui/material/Radio';
import FormControlLabel from '@mui/material/FormControlLabel';
import Badge from '@mui/material/Badge';
import Input from '@mui/material/Input';
import OnBlurInputBase from './onBlurInputBase';
import DLTFilterAssistantDialog from './dltFilterAssistant';
import DLTRestQueryManualDialog from './dltRestQueryManual';

import { AttributesContext } from './../App';
import { triggerRestQueryDetails, numberAbbrev, customEventStack } from './../util';

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

    const onDrop = React.useCallback((e) => {
        console.log(`DataProviderEditDialog.onDrop(e.detail=${JSON.stringify(e.detail)})`);
        if (e.detail.mimeType === 'application/vnd.dlt-logs+json') {
            // for now we do simply overwrite:
            const filterFrags = e.detail.values?.filterFrags;
            if (filterFrags !== undefined && Array.isArray(filterFrags) && filterFrags.length > 0) {
                const posNegFilterFrags = filterFrags.filter((f) => f.type <= 1); // (only pos and neg for badges)
                const reportFilterFrags = filterFrags.filter((f) => f.type === 3);
                if ((!props.applyMode && posNegFilterFrags.length > 0) || (props.applyMode && (posNegFilterFrags.length > 0 || reportFilterFrags.length > 0))) {
                    setDataType('ext:dlt');
                    // keep conv
                    // keep jsonpath if not empty
                    if (!props.applyMode && !dataJsonPath?.length) { setDataJsonPath('$.data[*]') }
                    const filterStrs = [];
                    if (posNegFilterFrags.length > 0 && attributes.findIndex(attr => attr.hasOwnProperty('lifecycles')) >= 0) {
                        // eslint-disable-next-line no-template-curly-in-string
                        filterStrs.push('{"lifecycles":"${attributes.lifecycles.id}","name":"not selected lifecycles","not":true,' + (props.applyMode ? '"tmpFb":1,' : '') + '"type":1}');
                    }
                    posNegFilterFrags.forEach((frag) => filterStrs.push(JSON.stringify({ ...frag, id: undefined, configs: undefined, tmpFb: props.applyMode ? 1 : undefined }))); // remove id,configs, set tmpFb

                    const reportStr = reportFilterFrags.length > 0 ? '&report=' + encodeURIComponent('[' + reportFilterFrags.map((f) => JSON.stringify({ ...f, id: undefined, configs: undefined })).join(',') + ']') : '';

                    setDataSource(
                        props.applyMode ?
                            `ext:mbehr1.dlt-logs/get/docs/0/filters?delete=${encodeURIComponent('{"tmpFb":1}')}${filterStrs.length > 0 ? '&disableAll=view&add=' + filterStrs.map((str) => encodeURIComponent(str)).join('&add=') : ''}${reportStr}` :
                            `ext:mbehr1.dlt-logs/get/docs/0/filters?query=${encodeURIComponent(`[${filterStrs.join(',')}]`)}`
                    );

                    setPreviewBadgeStatus(props.applyMode ? 3 : 0);

                    return false; // we handled, stop further processing        
                } else {
                    console.warn('DataProviderEditDialog.onDrop but no applicable filterFrags!');
                }
            } else {
                console.warn('DataProviderEditDialog.onDrop but no filterFrags!', filterFrags);
            }
        }
        return true; // we did not handle, keep on processing
    }, [props.applyMode, attributes, dataJsonPath]);

    useEffect(() => {
        setDataSource(props.data?.source);
        setDataJsonPath(props.data?.jsonPath);
        setDataConv(props.data?.conv ? props.data?.conv : (props.applyMode ? undefined : 'length:'))
        setDataType(props.data?.source?.startsWith("ext:mbehr1.dlt-logs") ? "ext:dlt" : "http")
    }, [props.data, props.applyMode]); // todo move into init values to safe one render!


    useEffect(() => {
        if (props.open) {
            console.warn(`DataProviderEditDialog attached ext:drop handler to customsEventStack`, customEventStack.length);
            customEventStack.push(['ext:drop', onDrop]);// elem.addEventListener('ext:drop', onDrop);
            return () => {
                const idx = customEventStack.findIndex(([, v]) => v === onDrop);
                if (idx >= 0) { customEventStack.splice(idx, 1); };
                console.warn(`DataProviderEditDialog removed ext:drop handler to elem. idx=${idx}`);
            }
        }
    }, [onDrop, props.open]);



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
                {props.applyMode ? 'Edit apply filter settings...' : 'Edit badge and filter settings...'}
                <IconButton
                    onClick={handleClose}
                    color="inherit"
                    style={{ position: 'absolute', right: 1 }}
                    size="large">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Grid container direction="column" justifyContent="flex-start" alignItems="stretch" spacing={2}>
                    <Grid item>
                        <Paper>
                            <RadioGroup row value={dataType} onChange={(event) => setDataType(event.target.value)}>
                                <FormControlLabel value="http" control={<Radio size="small" />} label={<Typography variant="body1">https rest query</Typography>} />
                                <FormControlLabel value="ext:dlt" control={<Radio size="small" />} label="extension dlt-logs rest query" />
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
                                    fullWidth
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
                            <InputLabel htmlFor="dataSourceInput" shrink color="primary">
                                "Enter dlt-logs rest query"
                            </InputLabel>
                            <Input id="dataSourceInput" inputComponent={OnBlurInputBase}
                                fullWidth
                                placeholder={props.applyMode ? "e.g. '/get/docs/0/filters?delete=(uriencode({...}))&add={...}'" : "e.g. '/get/docs/0/filters?query=...'"}
                                inputProps={{ value: dataSource?.startsWith('ext:mbehr1.dlt-logs') ? dataSource.slice(19) : dataSource, onChange: (event) => { setPreviewQueryResult(previewApplyText); setPreviewBadgeStatus(props.applyMode ? 3 : 0); setDataSource('ext:mbehr1.dlt-logs' + event.target.value); } }} />
                        </Paper>}
                        {!props.applyMode && <Paper>
                            <InputLabel shrink htmlFor="dataJsonPathInput">Enter jsonPath expression to extract results</InputLabel>
                            <Input id="dataJsonPathInput" inputComponent={OnBlurInputBase}
                                fullWidth
                                placeholder="e.g. '$.state' or '$.data[*]"
                                inputProps={{ value: dataJsonPath, onChange: (event) => { setPreviewQueryResult(previewApplyText); setPreviewBadgeStatus(props.applyMode ? 3 : 0); setDataJsonPath(event.target.value); } }}
                            />
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
                                <FormControlLabel value="length" control={<Radio size="small" />} label="number of array elements" />
                                <FormControlLabel value="index" control={<Radio size="small" />} label="first element" />
                                <FormControlLabel value="func" control={<Radio size="small" />} label="javascript function" />
                            </RadioGroup>
                            {dataConv?.startsWith("func") &&
                                <React.Fragment>
                                    <InputLabel shrink htmlFor="dataFuncInput">javascript function body</InputLabel>
                                    <Input id="dataFuncInput" inputComponent={OnBlurInputBase}
                                        placeholder="e.g. '{return result.message;}'"
                                        multiline
                                        inputProps={{ multiline: true, value: dataConv.slice(dataConv.indexOf(':') + 1), onChange: (event) => { setPreviewQueryResult(previewApplyText); setPreviewBadgeStatus(props.applyMode ? 3 : 0); setDataConv('func:' + event.target.value); } }}
                                    />
                                </React.Fragment>
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
                            {!props.applyMode && <Badge badgeContent={numberAbbrev(previewBadgeContent, 999)} color="error" anchorOrigin={{ vertical: 'top', horizontal: 'left', }} overlap="circular" max={NaN}>
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
