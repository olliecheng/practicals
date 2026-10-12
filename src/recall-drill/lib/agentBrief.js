// The brief the Agentic tab of the quiz editor shows: something to paste into an AI assistant together with a request.
// It has four parts: the global Agent quiz prompt from Settings (plain text, edited there), the categories that may be used (a JSON
// list), a schema (an example of the quiz format with a line for each section the quiz has now), and the quiz as it is now.

const fence = (json) => "```json\n" + json + "\n```";

// An example of the quiz format with a line for each section (the keys of `items`), so it follows the editor's sections live.
// Written by hand rather than with JSON.stringify's indent, which would spread every item over several lines.
const schema = (sections) => {
  const line = (name) =>
    `    ${JSON.stringify(name)}: { "<Category>": [ { "label": "...", "keywords": "a|b|c" }, ... ], ... }`;
  return [
    "{",
    '  "system": "...",',
    '  "name": "...",',
    sections.length ? '  "items": {' : '  "items": {}',
    ...(sections.length ? [sections.map(line).join(",\n"), "  }"] : []),
    "}",
  ].join("\n");
};

// The parts of the brief: [{title, text, mono, tone}]. The tab shows each in its own colour and font; Copy puts briefText(parts)
// on the clipboard. The categories, the schema and the quiz are fenced as JSON code blocks.
export const briefParts = ({ prompt, categories, sections, quiz }) => [
  {
    title: "Instructions",
    text: prompt.trim() || "(The Agent quiz prompt in Settings is empty.)",
    tone: "teal",
  },
  {
    title: "Valid categories",
    text: fence(JSON.stringify(categories)),
    mono: true,
    tone: "amber",
  },
  {
    title: "Schema",
    text: fence(schema(sections)),
    mono: true,
    tone: "green",
  },
  {
    title: "Current quiz",
    text: fence(JSON.stringify(quiz, null, 2)),
    mono: true,
    tone: "blue",
  },
];

// The last line of the brief, left open for the user to say what they want changed
export const CLOSING = "\nMake this change:\n";

export const briefText = (parts) =>
  parts
    .map((p) => `${p.title.toUpperCase()}\n\n${p.text}`)
    .join("\n\n---\n\n") + `\n\n${CLOSING}`;
