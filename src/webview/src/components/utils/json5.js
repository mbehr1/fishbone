import jju from 'jju'

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
 * - literals at begin of line are indented
 *
 * There is one special "legacy" rule:
 * - if there are no newlines, whitespaces nor comments we do assume it was from a prev. JSON.stringify(...) w.o. spaces.
 *   In that case a JSON.stringify(..., 2) is tried.
 * @param {string} json5Str
 * @returns formatted string as valid json5
 */
export function formatJson5(json5Str) {
  try {
    // use jju tokenizer:
    const tokens = jju.tokenize(json5Str)
    let formattedStr = ''
    let ignoreDirectNextWhitespace = false
    let nextLine = ''
    let nrNewLines = 0
    let nrWS = 0
    let nrComments = 0
    for (const token of tokens) {
      const atBeginOfLine = nextLine.length === 0
      if (ignoreDirectNextWhitespace && token.type !== 'whitespace') {
        ignoreDirectNextWhitespace = false
      }
      switch (token.type) {
        case 'separator':
          switch (token.raw) {
            case '{':
            case '}':
              if (atBeginOfLine) {
                nextLine += '  '.repeat(token.stack.length)
              }
              nextLine += token.raw
              break
            case ':':
              nextLine += token.raw
              nextLine += ' '
              ignoreDirectNextWhitespace = true
              break
            default:
              nextLine += token.raw
              break
          }
          break
        case 'newline':
          formattedStr += nextLine.trimEnd()
          nextLine = ''
          formattedStr += '\n'
          nrNewLines++
          break
        case 'literal':
        case 'key':
          if (atBeginOfLine) {
            nextLine += '  '.repeat(token.stack.length)
          }
          nextLine += token.raw
          break
        case 'whitespace':
          if (!atBeginOfLine && !ignoreDirectNextWhitespace) {
            nextLine += token.raw
          }
          nrWS++
          break
        case 'comment':
          nextLine += token.raw
          nrComments++
          break
        default:
          console.error(`formatJson5: unknown token '${token.type}'`, token)
          break
      }
    }
    if (nextLine.length > 0) formattedStr += nextLine

    // special legacy rule:
    // console.warn(`formatJson5: special legacy rule check: nrNewLines=${nrNewLines} nrWS=${nrWS} nrComments=${nrComments} for: ${json5Str}`);
    if (!nrNewLines && !nrWS && !nrComments) {
      try {
        formattedStr = JSON.stringify(JSON.parse(formattedStr), undefined, 2)
        // console.warn(`formatJson5: special legacy rule check formatted to: ${formattedStr}`);
      } catch (e) {
        console.warn(`formatJson5: special legacy rule check failed to apply due to '${e}'`)
      }
    }

    return formattedStr
  } catch (e) {
    console.error(`formatJson5: got error='${e}'`)
    return json5Str
  }
}
