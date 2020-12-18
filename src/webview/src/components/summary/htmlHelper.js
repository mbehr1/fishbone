import React from 'react'
import Link from '@material-ui/core/Link';
import Tooltip from '@material-ui/core/Tooltip'

/**
 * Returns a link based on the input path
 */
export function CreateLink(text, hook, parameter) {
    return (
        <Link component="button" key={text} onClick={(event) => { event.preventDefault(); hook(parameter); }} color="textPrimary">
            {text}
        </Link>
    );
}

/**
 * Returns a link based on the input path
 */
export function CreateTooltip(tooltipText, innerElement, key) {
    return (
        < Tooltip key={key} placement="top" title={tooltipText} arrow>
            {innerElement}
        </Tooltip >
    );
};
