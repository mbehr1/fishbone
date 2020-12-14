// copyright (c) 2020, Matthias Behr
import React from 'react';
import Dialog from '@material-ui/core/Dialog';
import { DialogContent } from '@material-ui/core';

import SummaryTable from './summary/table';
import { SummaryHeaderProvider, SummaryDataProvider } from './summary/dataProvider';

/**
 * Planned features:
 * - Consider badges with filters and results
 * - Jump to fishbone element on click
 * - Export as PDF
 */

/**
 * Open a modal dialog to show a table summary of all fishbone diagrams
 * @param {*} props (open, onChange, onClose)
 */
export default function SummaryDialog(props) {

    console.log(`SummaryDialog (open=${props.open})`);

    const handleClose = () => {
        props.onClose();
    }

    const header = SummaryHeaderProvider(props.fbdata);
    const data = SummaryDataProvider(props.fbdata);

    return (
        <Dialog fullScreen open={props.open} onClose={handleClose}>
            <DialogContent dividers>
                <SummaryTable onClose={handleClose} header={header} data={data}></SummaryTable>
            </DialogContent>
        </Dialog>
    );
};
