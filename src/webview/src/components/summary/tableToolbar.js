import React from 'react'

import GlobalFilter from './globalFilter'
import PropTypes from 'prop-types'
import Toolbar from '@mui/material/Toolbar'
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import CloseIcon from '@mui/icons-material/Close';
import { IconButton } from '@mui/material';

const TableToolbar = props => {

    const {
        preGlobalFilteredRows,
        setGlobalFilter,
        globalFilter,
        onClose
    } = props
    return (
        <Toolbar>
            <Typography variant="h6">Summary</Typography>
            <GlobalFilter
                preGlobalFilteredRows={preGlobalFilteredRows}
                globalFilter={globalFilter}
                setGlobalFilter={setGlobalFilter}
            />
            <Box display='flex' flexGrow={1}></Box> { /* https://stackoverflow.com/a/62735254 */}
            <IconButton
                onClick={onClose}
                color="primary"
                style={{ position: 'absolute', right: 1 }}
                size="large">
                <CloseIcon />
            </IconButton>
        </Toolbar>
    );
}

TableToolbar.propTypes = {
    setGlobalFilter: PropTypes.func.isRequired,
    preGlobalFilteredRows: PropTypes.array.isRequired,
    globalFilter: PropTypes.string.isRequired,
}

export default TableToolbar
