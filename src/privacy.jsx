import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@fontsource-variable/hanken-grotesk";
import "@fontsource-variable/bricolage-grotesque";

import "./index.css";

// Address for data requests; shown once set.
const CONTACT_EMAIL = "";

const Section = ({ title, children }) => (
  <section className="mb-6">
    <h2 className="font-serif text-xl font-semibold text-gray-800 mb-2">
      {title}
    </h2>
    <div className="text-gray-700 space-y-2">{children}</div>
  </section>
);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <div className="min-h-screen text-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <header className="text-left mb-8">
          <a
            href="/"
            className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
          >
            ← Back to Tests
          </a>
          <h1 className="font-serif text-3xl font-bold text-gray-800 mb-2">
            Privacy
          </h1>
          <p className="text-gray-600">
            How Medical Practice Tests handles your information, including the
            optional account for the History recall drill.
          </p>
        </header>

        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200 text-left">
          <Section title="Using the site without an account">
            <p>
              Every test works without signing in. Nothing about you is stored
              on our servers. Your browser keeps a few preferences locally (for
              example whether the drill is collapsed), which never leave your
              device.
            </p>
          </Section>

          <Section title="What we collect if you sign in">
            <p>
              Signing in is optional and uses your Google account (Sign in with
              Google). We receive and store:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                your name, email address and profile picture link from Google;
              </li>
              <li>
                the username you choose, if you set one on your profile page;
              </li>
              <li>
                your drill progress: the drills you have attempted, scores,
                items found, items you chose to ignore, and drills you starred.
              </li>
            </ul>
            <p>
              We never see or store your Google password. Google handles the
              sign-in and tells us only that you are who you say you are.
            </p>
          </Section>

          <Section title="What we do with it">
            <p>
              Your information is used only to keep you signed in and to save
              and show your own progress. We do not sell it, advertise with it
              or share it for marketing. Your email address is not shown to
              other users. Your username or Google name, and your profile
              picture, are shown in the page header while you are signed in. If
              features that let users share content are added, this page will be
              updated first.
            </p>
          </Section>

          <Section title="Cookies and storage">
            <p>
              Signing in sets a session cookie that is necessary for the site to
              recognise you; it is removed when you log out or it expires. We
              use no advertising or analytics cookies.
            </p>
          </Section>

          <Section title="Where it is stored">
            <p>
              Account and progress data is held in a database on Cloudflare,
              which also serves this site. Profile pictures are loaded directly
              from Google's servers, so Google can see that your browser
              requested the image.
            </p>
          </Section>

          <Section title="Access, correction and deletion">
            <p>
              You can change your username on your profile page and clear a
              drill's progress from the drill list. To have your account and all
              of your stored data deleted, or to ask what we hold about you,{" "}
              {CONTACT_EMAIL ? (
                <>
                  email{" "}
                  <a
                    className="text-blue-600 hover:text-blue-800"
                    href={`mailto:${CONTACT_EMAIL}`}
                  >
                    {CONTACT_EMAIL}
                  </a>
                  .
                </>
              ) : (
                "contact the site owner."
              )}
            </p>
          </Section>

          <Section title="Educational use only">
            <p>
              The tests and drills are study aids, not medical advice, and
              should not be used to make decisions about patient care.
            </p>
          </Section>
        </div>
      </div>
    </div>
  </StrictMode>,
);
