import React, { useState, useEffect } from 'react';

const rqUriDecode = (rq) => {
    if (!rq || rq.length === 0) { return ''; }

    let toRet = '';
    const indexOfQ = rq?.indexOf('?');
    if (indexOfQ > 0) {
        toRet += rq.slice(0, indexOfQ + 1) + '\n';
        const options = rq.slice(indexOfQ + 1);
        const optionArr = options.split('&');
        let andCnt = 0;
        for (const commandStr of optionArr) {
            const eqIdx = commandStr.indexOf('=');
            const command = commandStr.slice(0, eqIdx);
            const commandParams = decodeURIComponent(commandStr.slice(eqIdx + 1));
            if (andCnt) { toRet += ' &\n'; }
            andCnt++;
            try {
                toRet += command + '=' + JSON.stringify(JSON.parse(commandParams), ' ', 2) + '\n';
            } catch {
                if (commandParams.includes('{') || commandParams.includes('[') || commandParams.includes('"')) {
                    toRet += `<cannot parse: '${command}=${commandParams}' as JSON>`;
                } else {
                    toRet += `${command}=${commandParams}`;
                }
            }
        }
    } else { toRet = rq; }

    return toRet;
};

const rqUriEncode = (rq) => {
    let toRet = '';
    const indexOfQ = rq?.indexOf('?');
    if (indexOfQ > 0) {
        toRet += rq.slice(0, indexOfQ + 1);
        // we expect the & split by &\n (could parse as well JSON char by char until valid JSON)
        const options = rq.slice(indexOfQ + 1);
        const optionArr = options.split('&\n');
        let andCnt = 0;
        for (let commandStr of optionArr) {
            commandStr = commandStr.replace(/^\s+|\s+$/g, "");
            const eqIdx = commandStr.indexOf('=');
            if (andCnt) { toRet += '&'; }
            andCnt++;
            if (eqIdx >= 0) {
                const command = commandStr.slice(0, eqIdx);
                const commandParam = commandStr.slice(eqIdx + 1);
                try {
                    const commandParamEncoded = encodeURIComponent(JSON.stringify(JSON.parse(commandParam)));
                    toRet += `${command}=${commandParamEncoded}`;
                } catch {
                    // if its a simple string then it's ok
                    if (commandParam.includes('{') || commandParam.includes('[') || commandParam.includes('"')) {
                        toRet += `&<cannot parse: '${command}=${commandParam}' as JSON>`;
                    } else {
                        toRet += `${command}=${commandParam}`;
                    }
                }
            } else {
                toRet += `${commandStr}`;
            }
        }
    } else { toRet = rq; }
    return toRet;
};

export default function UriEnDecode(props) {
    const [text, setText] = useState(props?.searchParams?.get('q') ? decodeURIComponent(props?.searchParams?.get('q')) : '/get/docs/0/filters?query=%5B%5D');
    const [json, setJson] = useState(rqUriDecode(''));
    const [text2, setText2] = useState('');

    useEffect(() => {
        const newJson = rqUriDecode(text);
        if (newJson !== json) {
            setJson(newJson);
        }
    }, [text]);

    useEffect(() => {
        try {
            const newText = rqUriEncode(json);
            if (newText !== text2) {
                setText2(newText);
            }
        } catch {

        }
    }, [json]);

    return (<form>
        <label>
            DLT-Logs rest query (URI encoded):<br />
            <textarea cols={80} rows={20} value={text} placeholder='enter your dlt-logs rest query expression here' type="text" name="payloadRegex" onChange={(event) => setText(event.target.value)} />
        </label>
        <div></div>
        <label>
            DLT-Logs rest query (URI decoded, after &amp; as command sep. a new line has to follow):<br />
            <textarea cols={80} rows={30} type="text" value={json} onChange={(event) => setJson(event.target.value)} />
        </label>
        <div></div>
        <label>
            DLT-Logs rest query (URI re-encoded):{(text !== text2) ? ' modified!' : ''}<br />
            <textarea readOnly={true} cols={80} rows={20} type="text" value={text2} />
        </label>

    </form >);
}
