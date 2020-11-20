import React, { useEffect } from 'react';
import PropTypes from 'prop-types';

import InputBase from '@material-ui/core/InputBase';

export default function OnBlurInputBase(props) {
    const [value, setValue] = React.useState(props.value);

    useEffect(() => {
        setValue(props.value);
    }, [props.value]);

    return (
        <InputBase {...props} value={value} onChange={(event) => setValue(event.target.value)} onBlur={() => {
            if (value !== props.value) { props.onChange({ target: { value: value } }); } // todo id,...?
        }} />
    );
}

OnBlurInputBase.propTypes = {
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired
}