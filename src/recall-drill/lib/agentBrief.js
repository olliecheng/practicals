// The brief the Agentic tab of the quiz editor shows: something to paste into an AI assistant together with a request.
// It has three parts: the global Agent quiz prompt from Settings (plain text, edited there), the categories that may be used (a JSON
// list), and the quiz as it is now.

const fence = (json) => "```json\n" + json + "\n```";

// The three parts of the brief: [{title, text, mono, tone}]. The tab shows each in its own colour and font; Copy puts briefText(parts)
// on the clipboard. The categories and the quiz are fenced as JSON code blocks.
export const briefParts = ({ prompt, categories, quiz }) => [
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
    title: "Current quiz",
    text: fence(JSON.stringify(quiz, null, 2)),
    mono: true,
    tone: "blue",
  },
];

// The last line of the brief, left open for the user to say what they want changed
export const CLOSING = "Make this change:";

export const briefText = (parts) =>
  parts
    .map((p) => `${p.title.toUpperCase()}\n\n${p.text}`)
    .join("\n\n---\n\n") + `\n\n${CLOSING}`;
