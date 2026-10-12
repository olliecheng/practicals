// The brief the Agentic tab of the quiz editor shows: something to paste into an AI assistant together with a request.
// It has up to five parts: the global Agent quiz prompt from Settings (plain text, edited there), the categories that may be used (a JSON
// list), the global Agent quiz example from Settings (a whole quiz on one line), a schema (the quiz format with a line for each
// section the quiz has now), and the quiz as it is now.

const fence = (json) => "```json\n" + json + "\n```";

// An example of the quiz format with a line for each section (the keys of `items`), so it follows the editor's sections live.
// Written by hand rather than with JSON.stringify's indent, which would spread every item over several lines.
const schema = (sections) => {
  const line = (name) =>
    `    ${JSON.stringify(name)}: { "<Category>": [ { "label": "...", "keywords": "a|b|c" }, ... ], ... }`;
  return [
    "{",
    '  "name": "...",',
    sections.length ? '  "items": {' : '  "items": {}',
    ...(sections.length ? [sections.map(line).join(",\n"), "  }"] : []),
    "}",
  ].join("\n");
};

// The Agent quiz example from Settings on one line: parsed and written back without indentation. Text that isn't valid JSON
// (Settings only saves valid JSON, but the box is free-form) has its lines trimmed and joined instead.
const oneLine = (text) => {
  try {
    return JSON.stringify(JSON.parse(text));
  } catch {
    return text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .join(" ");
  }
};

// The parts of the brief: [{title, note?, text, mono, tone}]. The tab shows each in its own colour and font (a note is prose
// above the text); Copy puts briefText(parts) on the clipboard. The categories, the example, the schema and the quiz are fenced as
// JSON code blocks. The Instructions part is left out when the Agent quiz prompt in Settings is empty (it has no default), and so
// is the Example quiz when the Agent quiz example is.
export const briefParts = ({
  prompt,
  example = "",
  categories,
  sections,
  quiz,
}) => [
  ...(prompt.trim()
    ? [{ title: "Instructions", text: prompt.trim(), tone: "teal" }]
    : []),
  {
    title: "Valid categories",
    text: fence(JSON.stringify(categories)),
    mono: true,
    tone: "amber",
  },
  ...(example.trim()
    ? [
        {
          title: "Example quiz",
          note: "This is an example intended to demonstrate the depth, complexity, and number of entries per item to input. Keep your generated quiz to a similar length unless explicitly told otherwise. The items in your quiz will be different, so always follow the schema below strictly.",
          text: fence(oneLine(example)),
          mono: true,
          tone: "green",
        },
      ]
    : []),
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
    .map(
      (p) =>
        `${p.title.toUpperCase()}\n\n${p.note ? `${p.note}\n\n` : ""}${p.text}`,
    )
    .join("\n\n---\n\n") + `\n\n${CLOSING}`;
