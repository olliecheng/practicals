import { Link } from "react-router-dom";
import { drillPath } from "../lib/legacy";

const DEMO_QUIZ = "01a0f4c2-eef8-7298-8895-080a88b3579a"; // obstructive sleep apnoea, the one quiz guests are pointed to

// What guests are told about the beta: shown over the locked playlists (BetaLock) and on the login page.
export default function BetaMessage() {
  return (
    <div className="beta-msg">
      <p>
        Thanks for your interest in MedPunk, a learning tool for medical
        students similar to the quiz site JetPunk!
      </p>
      <p>
        Currently, MedPunk is under development and available only to beta
        testers. Contact Ollie or Proshot for access.
      </p>
      <p>
        You can try the demo quiz on{" "}
        <Link to={drillPath(DEMO_QUIZ)}>obstructive sleep apnoea</Link>.
      </p>
    </div>
  );
}
