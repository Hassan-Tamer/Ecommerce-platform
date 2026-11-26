// Models sometimes jam a bullet list onto one line: "orders: - **Order 16** ... - **Order 15**".
// A real list needs each marker at the start of a line.
const MONTH =
  'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec'

export function prepareAssistantMarkdown(text) {
  return text
    .replace(/(^|[^!])\[[^\]]*\]\([^)]*\)/g, '$1')
    .replace(/\/products\/[A-Za-z0-9_-]+/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+([-*])[ \t]+\*\*/g, '\n$1 **')
    .replace(/[ \t]+(\d+)\.[ \t]+\*\*/g, '\n$1. **')
    .replace(new RegExp(`(\\b(?:${MONTH}) \\d{1,2}) +(?=[A-Z])`, 'g'), '$1\n\n')
    .trim()
}
