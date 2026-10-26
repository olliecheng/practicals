import { useEffect, useRef } from "react";
import { setAccessDeniedHandler } from "../lib/api";
import { useAccount } from "../state/AccountContext";
import { useDialog } from "./Dialog";

// Changing shared content (quizzes, playlists, the global settings) is limited to the approved editors (worker/permissions.js).
// The server decides and sends `canEdit` with the session; it re-checks every write, so this is only the friendly side.
//   <RequireEditor onDenied={...}>...</RequireEditor>  wraps an edit page or modal: waits for the session, renders the children
//   for an editor, otherwise opens the Access denied dialog once and calls onDenied (leave the page, close the modal).
//   <AccessDeniedListener/>  (once, inside DialogProvider) opens the same dialog when the server answers 403 "editor_only".
const DENIED = {
  title: "Access denied",
  message: "Only approved editors can make this change.",
};

export function AccessDeniedListener() {
  const { alert } = useDialog();
  useEffect(() => {
    setAccessDeniedHandler(() =>
      alert(DENIED.message, { title: DENIED.title }),
    );
    return () => setAccessDeniedHandler(null);
  }, [alert]);
  return null;
}

export default function RequireEditor({ children, onDenied }) {
  const { canEdit, sessionPending } = useAccount();
  const { alert } = useDialog();
  const denied = !sessionPending && !canEdit;
  const cb = useRef(onDenied);
  cb.current = onDenied;
  useEffect(() => {
    if (!denied) return;
    alert(DENIED.message, { title: DENIED.title });
    cb.current?.();
  }, [denied, alert]);
  return sessionPending || denied ? null : children;
}
