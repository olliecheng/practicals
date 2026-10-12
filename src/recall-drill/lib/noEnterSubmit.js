// For the editors' <form onKeyDown>: Enter in a text box would submit the form (browsers press the Save button for you), but saving
// is only ever done by clicking or pressing Save itself. Buttons and textareas keep their own Enter (click, new line).
export const noEnterSubmit = (e) => {
  if (e.key === "Enter" && e.target.tagName === "INPUT") e.preventDefault();
};
