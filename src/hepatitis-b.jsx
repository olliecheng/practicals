import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource-variable/hanken-grotesk";
import "./recall-drill/recall-drill.css";
import "./quiz/quiz.css";
import MiniPage from "./components/MiniPage.jsx";
import { getPosNeg } from "./utils/labUtils.jsx";

import QuizEngine from "./components/QuizEngine.jsx";

const generateHepatitisBCase = () => {
  const scenarios = ["resolved", "vaccinated", "acute", "chronic"];
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

  let hbsAg, hbeAg, antiHBe, antiHBcIgM, antiHBsAg, antiHBcIgG, interpretation;

  switch (scenario) {
    case "acute":
      hbsAg = "positive";
      hbeAg = "positive";
      antiHBe = "negative";
      antiHBcIgM = "positive";
      antiHBcIgG = "negative";
      antiHBsAg = "negative";
      interpretation =
        "Acute hepatitis B infection. Active viral replication with recent infection markers.";
      break;

    case "chronic":
      hbsAg = "positive";
      antiHBcIgM = "negative";
      antiHBcIgG = "positive";
      antiHBsAg = "negative";
      interpretation =
        "Chronic hepatitis B infection. Persistent viral presence without IgM, indicating chronic infection. HBeAg+ indicates active chronic infection, Anti-HBe indicates inactive chronic infection.";

      if (Math.random() < 0.5) {
        hbeAg = "negative";
        antiHBe = "positive";
      } else {
        hbeAg = "positive";
        antiHBe = "negative";
      }
      break;

    case "resolved":
      hbsAg = "negative";
      hbeAg = "negative";
      antiHBe = "positive";
      antiHBcIgM = "negative";
      antiHBcIgG = "positive";
      antiHBsAg = "positive";
      interpretation =
        "Resolved hepatitis B infection with immunity. Past infection with recovery and protective antibodies.";
      break;

    case "vaccinated":
      hbsAg = "negative";
      hbeAg = "negative";
      antiHBe = "negative";
      antiHBcIgM = "negative";
      antiHBcIgG = "negative";
      antiHBsAg = "positive";
      interpretation =
        "Immune due to hepatitis B vaccination. Surface antibodies from vaccination, not natural infection.";
      break;
  }

  const ages = [28, 34, 42, 29, 37, 45, 31, 38, 26, 41];
  const genders = ["male", "female"];
  const presentations = [
    "routine health screening",
    "pre-employment physical",
    "presenting with fatigue and elevated ALT",
    "contact tracing for hepatitis B exposure",
    "pregnancy screening",
    "prior to immunosuppressive therapy",
    "HIV co-infection screening",
    "family history of hepatitis B",
  ];

  return {
    patient: {
      description: `${ages[Math.floor(Math.random() * ages.length)]}-year-old ${
        genders[Math.floor(Math.random() * genders.length)]
      }`,
      mhx: `Patient presents for ${
        presentations[Math.floor(Math.random() * presentations.length)]
      }. Hepatitis B serology was ordered as part of evaluation.`,
    },
    labs: [
      {
        test: "HBsAg",
        result: getPosNeg(hbsAg),
      },
      {
        test: "HBeAg",
        result: getPosNeg(hbeAg),
      },
      {
        test: "Anti-HBe",
        result: getPosNeg(antiHBe),
      },
      {
        test: "Anti-HBc IgM",
        result: getPosNeg(antiHBcIgM),
      },
      {
        test: "Anti-HBc IgG",
        result: getPosNeg(antiHBcIgG),
      },
      {
        test: "Anti-HBsAg",
        result: getPosNeg(antiHBsAg),
      },
    ],
    labsAnnotation:
      "All tests performed using standard immunoassays with appropriate controls.",
    questions: [
      {
        type: "selectOne",
        text: "Based on this hepatitis B serology pattern, what is the most likely interpretation?",
        options: [
          {
            id: "resolved",
            text: "Resolved HBV infection",
            description: "Past infection with immunity",
            correct: scenario === "resolved",
          },
          {
            id: "vaccinated",
            text: "Vaccinated",
            description: "Immune due to vaccination",
            correct: scenario === "vaccinated",
          },
          {
            id: "acute",
            text: "Acute HBV infection",
            description: "Active acute infection",
            correct: scenario === "acute",
          },
          {
            id: "chronic",
            text: "Chronic HBV infection",
            description: "Chronic persistent infection",
            correct: scenario === "chronic",
          },
        ],
        explanation: (
          <div>
            <p>
              <strong>Interpretation:</strong> {interpretation}
            </p>
          </div>
        ),
      },
      {
        type: "selectOne",
        text: "What do you expect HBV-DNA to be in this patient?",
        options: [
          {
            id: "high",
            text: "Positive",
            correct: ["acute", "chronic"].includes(scenario),
          },
          {
            id: "low",
            text: "Negative",
            correct: !["acute", "chronic"].includes(scenario),
          },
        ],
        explanation:
          "HBV-DNA indicates viral replication, which occurs during acute or chronic infection.",
      },
    ],
  };
};

const HEPATITIS_B_CONFIG = {
  title: "Hepatitis B Serology Interpretation",
  description:
    "Each case presents a patient with hepatitis B serology results. Analyze the pattern of HBsAg, Anti-HBc, Anti-HBs, and IgM Anti-HBc to determine the clinical status and appropriate management.",
  startButtonText: "Generate First Case",
  hideNormalValues: true,
  generateCase: generateHepatitisBCase,
};

function HepatitisBTest() {
  return <QuizEngine quizConfig={HEPATITIS_B_CONFIG} />;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <MiniPage
      title={HEPATITIS_B_CONFIG.title}
      blurb="Master hepatitis B serology interpretation using pattern recognition of HBsAg, Anti-HBc, and Anti-HBs to differentiate acute, chronic, resolved, and vaccine-induced immunity."
    >
      <HepatitisBTest />
    </MiniPage>
  </StrictMode>,
);
