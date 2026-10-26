// Who may change shared content (quizzes, playlists, settings). Hard-coded on purpose: the list lives only on the server and the client is just told the verdict (`canEdit` on the session user). Matching is on the verified email, lower-cased; user ids are random UUIDs minted at first sign-in, so they cannot be listed in advance.
const EDITOR_EMAILS = new Set([
  "proshotrafiee@gmail.com",
  "oliveryecheng@gmail.com",
  "chappspam@hotmail.com",
]);

export const canEdit = (user) =>
  !!user &&
  user.emailVerified === true &&
  !user.banned &&
  typeof user.email === "string" &&
  EDITOR_EMAILS.has(user.email.toLowerCase());
