// copyright (c) 2020, Matthias Behr
import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import { Button, DialogContent, DialogTitle, FormControl, IconButton, InputLabel, TextField } from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import RadioGroup from '@material-ui/core/RadioGroup';
import Radio from '@material-ui/core/Radio';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Badge from '@material-ui/core/Badge';
import Input from '@material-ui/core/Input';
import OnBlurInputBase from './onBlurInputBase';
import DLTFilterAssistantDialog from './dltFilterAssistant';

import { triggerRestQueryDetails } from './../util';

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

    const [dataType, setDataType] = React.useState();
    const [dataSource, setDataSource] = React.useState();
    const [dataJsonPath, setDataJsonPath] = React.useState();
    const [dataConv, setDataConv] = React.useState('length:');

    useEffect(() => {
        setDataSource(props.data?.source);
        setDataJsonPath(props.data?.jsonPath);
        setDataConv(props.data?.conv ? props.data?.conv : 'length:')
        setDataType(props.data?.source?.startsWith("ext:mbehr1.dlt-logs") ? "ext:dlt" : "http")
    }, [props.data]);

    // DLTFilterAssistantDialog handling
    const [dltFilterAssistantOpen, setDltFilterAssistantOpen] = React.useState(false);

    // preview badge content
    const [previewBadgeContent, setPreviewBadgeContent] = React.useState();
    const [previewBadgeStatus, setPreviewBadgeStatus] = React.useState(0);
    const [previewBadgeError, setPreviewBadgeError] = React.useState('');
    const [previewQueryResult, setPreviewQueryResult] = React.useState('');

    useEffect(() => {
        console.log(`FBACheckbox effect for badge processing called (badgeStatus=${previewBadgeStatus}, source=${JSON.stringify(dataSource)})`);
        if (!previewBadgeStatus && dataSource) {
            const fetchdata = async () => {
                try {
                    setPreviewBadgeError('querying...');
                    setPreviewBadgeStatus(1);
                    const res = await triggerRestQueryDetails({ source: dataSource, jsonPath: dataJsonPath, conv: dataConv });
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
    }, [previewBadgeStatus, dataSource, dataJsonPath, dataConv, previewBadgeError]);

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
                Edit badge and filter settings...
                <IconButton onClick={handleClose} color="primary" style={{ position: 'absolute', right: 1 }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Grid container direction="column" justify="flex-start" alignItems="stretch" spacing={2}>
                    <Grid item>
                        <Paper>
                            <RadioGroup row value={dataType} onChange={(event) => setDataType(event.target.value)}>
                                <FormControlLabel value="http" control={<Radio color="primary" />} label="https rest query" labelPlacement="top" />
                                <FormControlLabel value="ext:dlt" control={<Radio color="primary" />} label="extension dlt-logs rest query" labelPlacement="top" />
                            </RadioGroup>
                        </Paper>
                    </Grid>
                    <Grid item>
                        {dataType === 'http' && <Paper>
                            <FormControl variant="outlined" fullWidth margin="normal">
                                <InputLabel htmlFor="dataSourceInput">
                                    Enter https URL e.g. https://api.github.com/repos/mbehr1/fishbone/issues
                                </InputLabel>
                                <OnBlurInputBase fullWidth id="dataSourceInput" value={dataSource} onChange={(event) => { setPreviewBadgeStatus(0); setDataSource(event.target.value); }} />
                            </FormControl>
                        </Paper>}
                        {dataType === 'ext:dlt' && <Paper>
                            <Button variant="outlined" color="primary" onClick={() => setDltFilterAssistantOpen(true)}>
                                Open DLT filter assistant...
                            </Button>
                            <DLTFilterAssistantDialog
                                dataSource={dataSource?.startsWith('ext:mbehr1.dlt-logs') ? dataSource : 'ext:mbehr1.dlt-logs/get/docs/0/filters?query=[]'}
                                onChange={(newValue) => { setDataSource(newValue); if (!dataJsonPath?.length) { setDataJsonPath('$.data[*]') } }}
                                open={dltFilterAssistantOpen}
                                onClose={() => setDltFilterAssistantOpen(false)}
                            />
                            <FormControl variant="outlined" fullWidth margin="normal">
                                <InputLabel htmlFor="dataSourceInput">
                                    Enter rest query e.g. '/get/docs/0/filters?query=[...]'
                                </InputLabel>
                                <OnBlurInputBase fullWidth id="dataSourceInput" value={dataSource?.startsWith('ext:mbehr1.dlt-logs') ? dataSource.slice(19) : dataSource} onChange={(event) => { setPreviewBadgeStatus(0); setDataSource('ext:mbehr1.dlt-logs' + event.target.value); }} />
                            </FormControl>

                        </Paper>}
                        <Paper>
                            <FormControl variant='outlined' fullWidth margin="normal">
                                <InputLabel htmlFor="dataJsonPathInput">enter a jsonPath expression to extract results e.g. $.state</InputLabel>
                                <Input id="dataJsonPathInput"
                                    inputComponent={OnBlurInputBase}
                                    inputProps={{ value: dataJsonPath, onChange: (event) => { setPreviewBadgeStatus(0); setDataJsonPath(event.target.value); } }}
                                />
                            </FormControl>
                            <RadioGroup row value={dataConv.split(':')[0]} onChange={(event) => {
                                setPreviewBadgeStatus(0);
                                switch (event.target.value) {
                                    case 'index': setDataConv('index:0'); break;
                                    case 'length': setDataConv('length:'); break;
                                    case 'func': setDataConv('func:' + dataConv.slice(dataConv.indexOf(':') + 1)); break;
                                    default: break;
                                }
                            }}>
                                <FormControlLabel value="length" control={<Radio color="primary" />} label="number of array elements" labelPlacement="top" />
                                <FormControlLabel value="index" control={<Radio color="primary" />} label="first element" labelPlacement="top" />
                                <FormControlLabel value="func" control={<Radio color="primary" />} label="javascript function" labelPlacement="top" />
                            </RadioGroup>
                            {dataConv?.startsWith("func") &&
                                <FormControl variant="outlined" fullWidth margin="normal">
                                    <TextField label="javascript function body e.g. '{return result.message;}'" multiline value={dataConv.slice(dataConv.indexOf(':') + 1)} onChange={(event) => { setDataConv('func:' + event.target.value); }} />
                                </FormControl>
                            }
                        </Paper>
                    </Grid>
                    <Grid item>
                        <Paper>
                            <Badge badgeContent={previewBadgeContent} color="error" anchorOrigin={{ vertical: 'top', horizontal: 'left', }} overlap="circle" max={999}>
                                badge content='{JSON.stringify(previewBadgeContent)}'
                            </Badge>
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
                <Button autoFocus onClick={handleSave} color="primary">
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
    onClose: PropTypes.func.isRequired
};
