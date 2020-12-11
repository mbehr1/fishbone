import DOMPurify from 'dompurify';
const toMarkdown = require('marked');

/**
 * helper function to check and return the o.markdownFormat state
 */
export function GetMarkdownActive(property) {
    return property && property.markdownFormat ? true : false;
}

/**
 * helper function to check and return the o.textValue attribute
 */
export function GetTextValue(property) {
    return property && property.textValue ? property.textValue : '';
}

/**
 * Returns input text in different format
 * markdownActive = true: In HTML formated markdown
 * markdownActive = false: As normal Typography text
 */
export function RenderConditionText(property) {
    const markdownActive = property.markdownActive;
    if (markdownActive) {
        return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(toMarkdown(property.text)) }} />;
    }
    return <div style={{ whiteSpace: 'pre-line' }} >{property.text}</div>;
}
