import React from 'react'

import GlobalFilter from './globalFilter'
import PropTypes from 'prop-types'
import Toolbar from '@material-ui/core/Toolbar'
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';

import CloseIcon from '@material-ui/icons/Close';
import { IconButton } from '@material-ui/core';

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
            <IconButton onClick={onClose} color="primary" style={{ position: 'absolute', right: 1 }}>
                <CloseIcon />
            </IconButton>
        </Toolbar>
    )
}

TableToolbar.propTypes = {
    setGlobalFilter: PropTypes.func.isRequired,
    preGlobalFilteredRows: PropTypes.array.isRequired,
    globalFilter: PropTypes.string.isRequired,
}

export default TableToolbar
