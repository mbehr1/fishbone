// copyright (c) 2020 - 2023, Matthias Behr
import React, { useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import { Button, DialogContent, DialogTitle, IconButton, TextField } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'

/**
 * open a modal dialog to edit text field information
 * @param {*} props (open, onChange, onClose)
 */
export default function TextFieldEditDialog(props) {
  // console.log(`TextFieldEditDialog (open=${props.open})`)

  const [dataTextValue, setDataTextValue] = React.useState() // Contains the text that was entered into the text field
  const [markdownFormat, setMarkdownFormat] = React.useState() // 0 = not active normal text, 1 = active markdown format

  useEffect(() => {
    setDataTextValue(props.data?.textValue)
    setMarkdownFormat(props.data?.markdownFormat)
  }, [props.data])

  const handleClose = () => {
    props.onClose()
  }

  const toggleMarkdown = () => {
    setMarkdownFormat((prev) => !prev)
  }

  const handleSave = () => {
    console.log(`TextFieldEditDialog handleSave()`)
    console.log(` textValue=${dataTextValue}`)
    console.log(` markdownFormat=${markdownFormat}`)

    // if one differs from props.data call props.onChange
    if (typeof props.data === 'object') {
      if (dataTextValue !== props.data.textValue || markdownFormat !== props.data.markdownFormat) {
        props.onChange({ ...props.data, textValue: dataTextValue, markdownFormat: markdownFormat })
      }
    }
    props.onClose()
  }

  return (
    <Dialog fullWidth={true} open={props.open} maxWidth='md' onClose={handleClose}>
      <DialogTitle id='textFieldEditDialogTitle'>
        {props.label}
        <IconButton onClick={handleClose} color='inherit' style={{ position: 'absolute', right: 1 }} size='large'>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <FormControlLabel
          control={<Switch color='secondary' checked={markdownFormat} onChange={toggleMarkdown} />}
          label={markdownFormat ? 'Markdown on' : 'Markdown off'}
        ></FormControlLabel>
        <TextField
          name={props.label}
          margin='dense'
          id={'description-field-' + props.label}
          InputLabelProps={{ shrink: true }}
          fullWidth
          multiline
          value={dataTextValue}
          onChange={(event) => setDataTextValue(event.target.value)}
          placeholder={props.placeholder}
        ></TextField>
      </DialogContent>
      <DialogActions>
        <Button size='small' autoFocus onClick={handleSave} color='primary'>
          Save changes
        </Button>
      </DialogActions>
    </Dialog>
  )
}
