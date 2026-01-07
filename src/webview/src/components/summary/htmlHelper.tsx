import React from 'react'
import Link from '@mui/material/Link'
import Tooltip from '@mui/material/Tooltip'

/**
 * Returns a link based on the input path
 */
export function CreateLink(text:string, hook: (param: string)=>void, parameter:string) {
  return (
    <Link
      component='button'
      key={text}
      onClick={(event) => {
        event.preventDefault()
        hook(parameter)
      }}
      color='textPrimary'
    >
      {text}
    </Link>
  )
}

/**
 * Returns a link based on the input path
 */
export function CreateTooltip(tooltipText:string, innerElement: React.ReactElement, key: string) {
  return (
    <Tooltip key={key} placement='top' title={tooltipText} arrow>
      {innerElement}
    </Tooltip>
  )
}
