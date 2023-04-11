import jju from 'jju';

/**
 * Indent/format a string representing a valid json5 expression.
 * 
 * It's like JSON.stringify(JSON.parse(str)) but for JSON5 strings keeping
 * comments, hex numbers, etc.
 * The string is expected to be a valid JSON5 string already!
 * 
 * The following rules are applied:
 * - whitespace at begin of the line is ignored
 * - whitespace at end of a line is removed
 * - keys at begin of line are indented by 2 spaces per nested stack
 * - after separator ':' a space is added
 * - {} at begin of line are indented by 2 spaces per nested stack
 * - literals at begin of line are indented... todo
 * @param {string} json5Str 
 * @returns formatted string as valid json5
 */
export function formatJson5(json5Str) {
    try {
        // use jju tokenizer:
        const tokens = jju.tokenize(json5Str);
        let formattedStr = '';
        let ignoreDirectNextWhitespace = false;
        let nextLine = '';
        for (const token of tokens) {
            const atBeginOfLine = nextLine.length === 0;
            if (ignoreDirectNextWhitespace && token.type !== 'whitespace') { ignoreDirectNextWhitespace = false; }
            switch (token.type) {
                case 'separator':
                    switch (token.raw) {
                        case '{':
                        case '}':
                            if (atBeginOfLine) { nextLine += '  '.repeat(token.stack.length); }
                            nextLine += token.raw;
                            break;
                        case ':':
                            nextLine += token.raw;
                            nextLine += ' ';
                            ignoreDirectNextWhitespace = true;
                            break;
                        default:
                            nextLine += token.raw;
                            break;
                    }
                    break;
                case 'newline': formattedStr += nextLine.trimEnd(); nextLine = ''; formattedStr += '\n'; break;
                case 'literal':
                case 'key':
                    if (atBeginOfLine) {
                        nextLine += '  '.repeat(token.stack.length);
                    }
                    nextLine += token.raw;
                    break;
                case 'whitespace': if (!atBeginOfLine && !ignoreDirectNextWhitespace) { nextLine += token.raw; } break;
                case 'comment': nextLine += token.raw; break;
                default:
                    console.error(`formatJson5: unknown token '${token.type}'`, token);
                    break;
            }
        }
        if (nextLine.length > 0) formattedStr += nextLine;
        return formattedStr;
    } catch (e) {
        console.error(`formatJson5: got error='${e}'`);
        return json5Str;
    }
}
