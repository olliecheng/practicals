import { useAccount } from "../state/AccountContext";
import BetaMessage from "./BetaMessage";

// Guests can't pick quizzes from the playlists: the children are covered by a tinted veil with a message, and made inert.
// A soft, frontend-only block (the API stays public, and /q/<id> links still play).
// Keys off the session, not `acct`, which is also null while a signed-in user's record loads.
// `tall`: for a long list, the message sits at the top and follows the scroll instead of being centred.
export default function BetaLock({ children, tall }) {
  const { profile, sessionPending } = useAccount();
  const locked = !sessionPending && !profile;
  if (!locked) return children;
  return (
    <div className="betalock">
      <div inert="" aria-hidden="true">
        {children}
      </div>
      <div
        className={tall ? "betalock-veil tall" : "betalock-veil"}
        role="note"
      >
        <div className="betalock-msg">
          <BetaMessage />
        </div>
      </div>
    </div>
  );
}
