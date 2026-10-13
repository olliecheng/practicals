import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource-variable/hanken-grotesk";
import "./recall-drill/recall-drill.css";
import "./quiz/quiz.css";
import MiniPage from "./components/MiniPage.jsx";

import QuizEngine from "./components/QuizEngine.jsx";

const generateDexamethasoneCase = () => {
  const diagnoses = [
    "normal",
    "cushing-disease",
    "adrenal-cushing",
    "ectopic-acth",
  ];
  const diagnosis = diagnoses[Math.floor(Math.random() * diagnoses.length)];

  let baselineCortisol,
    baselineACTH,
    lowDoseCortisol,
    highDoseCortisol,
    diagnosisExplanation;

  switch (diagnosis) {
    case "normal":
      baselineCortisol = Math.round((Math.random() * 22 + 8) * 10) / 10; // 22-31 μg/dL
      baselineACTH = Math.round(Math.random() * 40 + 15); // 15-55 pg/mL
      lowDoseCortisol = Math.round((Math.random() * 3 + 1) * 10) / 10; // 1.0-4.0 μg/dL
      highDoseCortisol = Math.round((Math.random() * 2 + 0.5) * 10) / 10; // 0.5-2.5 μg/dL
      diagnosisExplanation =
        "Normal suppression with low dose dexamethasone (>50% reduction) indicates intact hypothalamic-pituitary-adrenal axis function. The low-dose suppression rules out pathological hypercortisolism. This patient may have pseudo-Cushing syndrome or subclinical hypercortisolism.";
      break;

    case "cushing-disease":
      baselineCortisol = Math.round((Math.random() * 55 + 25) * 10) / 10; // 25.0-80.0 μg/dL
      baselineACTH = Math.round(Math.random() * 140 + 60); // 60-200 pg/mL
      lowDoseCortisol =
        Math.round(baselineCortisol * (0.7 + Math.random() * 0.25) * 10) / 10; // 70-95% of baseline
      highDoseCortisol =
        Math.round(baselineCortisol * (0.2 + Math.random() * 0.3) * 10) / 10; // 20-50% of baseline (suppresses)
      diagnosisExplanation =
        "Elevated baseline cortisol/ACTH with lack of suppression to low dose but >50% suppression with high dose dexamethasone indicates pituitary adenoma secreting ACTH. The pituitary adenoma retains some sensitivity to high-dose dexamethasone feedback.";
      break;

    case "adrenal-cushing":
      baselineCortisol = Math.round((Math.random() * 70 + 30) * 10) / 10; // 30.0-100.0 μg/dL
      baselineACTH = Math.round(Math.random() * 8 + 2); // 2-10 pg/mL (suppressed)
      lowDoseCortisol =
        Math.round(baselineCortisol * (0.85 + Math.random() * 0.1) * 10) / 10; // 85-95% of baseline
      highDoseCortisol =
        Math.round(baselineCortisol * (0.8 + Math.random() * 0.15) * 10) / 10; // 80-95% of baseline
      diagnosisExplanation =
        "Very high cortisol with suppressed ACTH and no suppression with either dexamethasone dose indicates autonomous cortisol production from adrenal adenoma or carcinoma. The adrenal tissue operates independently of hypothalamic-pituitary control.";
      break;

    case "ectopic-acth":
      baselineCortisol = Math.round((Math.random() * 110 + 40) * 10) / 10; // 40.0-150.0 μg/dL
      baselineACTH = Math.round(Math.random() * 400 + 100); // 100-500 pg/mL
      lowDoseCortisol =
        Math.round(baselineCortisol * (0.9 + Math.random() * 0.08) * 10) / 10; // 90-98% of baseline
      highDoseCortisol =
        Math.round(baselineCortisol * (0.85 + Math.random() * 0.1) * 10) / 10; // 85-95% of baseline
      diagnosisExplanation =
        "Markedly elevated cortisol and ACTH with no suppression to either dexamethasone dose indicates ACTH secretion from a non-pituitary tumor (lung, pancreas, etc.). These tumors do not respond to dexamethasone feedback mechanisms.";
      break;
  }

  const ages = [25, 32, 28, 45, 38, 52, 41, 29, 36, 48];
  const genders = ["male", "female"];

  const isLowDoseSuppressed = lowDoseCortisol < baselineCortisol * 0.5;
  const isHighDoseSuppressed = highDoseCortisol < baselineCortisol * 0.5;

  return {
    patient: {
      description: `${ages[Math.floor(Math.random() * ages.length)]}-year-old ${
        genders[Math.floor(Math.random() * genders.length)]
      }`,
      mhx: "Biochemically confirmed hypercortisolism. Dexamethasone suppression testing was performed to determine the source of excess cortisol production.",
    },
    labs: [
      {
        test: "Baseline Cortisol",
        result: `${baselineCortisol} μg/dL`,
        normal: "5-25 μg/dL",
      },
      {
        test: "Baseline ACTH",
        result: `${baselineACTH} pg/mL`,
        normal: "10-60 pg/mL",
      },
      {
        test: "Low Dose Dex Cortisol",
        result: `${lowDoseCortisol} μg/dL`,
        normal: "<5 μg/dL (normal suppression)",
      },
      {
        test: "High Dose Dex Cortisol",
        result: `${highDoseCortisol} μg/dL`,
        normal: "<5 μg/dL (normal suppression)",
      },
    ],
    questions: [
      {
        type: "selectAll",
        text: "Based on the dexamethasone suppression test results above, which doses effectively suppressed cortisol?",
        options: [
          {
            id: "lowDoseSuppress",
            title: "Suppression Assessment",
            text: "Low dose dexamethasone suppresses cortisol",
            description: `Does ${lowDoseCortisol} μg/dL represent effective suppression from baseline (${baselineCortisol} μg/dL)?`,
            correct: isLowDoseSuppressed,
          },
          {
            id: "highDoseSuppress",
            title: "Diagnosis",
            text: "High dose dexamethasone suppresses cortisol",
            description: `Does ${highDoseCortisol} μg/dL represent effective suppression from baseline (${baselineCortisol} μg/dL)?`,
            correct: isHighDoseSuppressed,
          },
        ],
        explanation: (
          <ul>
            <li>
              <b>Low dose </b>
              {isLowDoseSuppressed
                ? "suppresses cortisol (< 50% of baseline)"
                : "does not suppress cortisol (> 50% of baseline)"}
            </li>
            <li>
              <b>High dose </b>
              {isHighDoseSuppressed
                ? "suppresses cortisol (< 50% of baseline)"
                : "does not suppress cortisol (> 50% of baseline)"}
            </li>
          </ul>
        ),
      },
      {
        type: "selectOne",
        text: "Select Your Diagnosis",
        options: [
          {
            id: "normal",
            text: "Non-neoplastic hypercortisolism",
            description: "Pseudo-Cushing's disease: normal HPA axis",
            correct: diagnosis === "normal",
          },
          {
            id: "cushing-disease",
            text: "Cushing Disease",
            description: "Pituitary adenoma",
            correct: diagnosis === "cushing-disease",
          },
          {
            id: "adrenal-cushing",
            text: "Primary Adrenal Disease",
            description: "Adrenal adenoma/carcinoma",
            correct: diagnosis === "adrenal-cushing",
          },
          {
            id: "ectopic-acth",
            text: "Ectopic ACTH Syndrome",
            description: "Non-pituitary ACTH source",
            correct: diagnosis === "ectopic-acth",
          },
        ],
        explanation: diagnosisExplanation,
      },
    ],
  };
};

const DEXAMETHASONE_CONFIG = {
  title: "Dexamethasone Suppression Test",
  description:
    "Each case presents a patient with confirmed hypercortisolism and results from low and high dose dexamethasone suppression testing. Analyze the lab patterns to determine the source of excess cortisol.",
  startButtonText: "Generate First Case",
  generateCase: generateDexamethasoneCase,
};

function DexamethasoneTest() {
  return <QuizEngine quizConfig={DEXAMETHASONE_CONFIG} />;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <MiniPage
      title={DEXAMETHASONE_CONFIG.title}
      blurb="The dexamethasone test measures cortisol before and after taking dexamethasone to check if cortisol levels are under normal physiological control."
    >
      <DexamethasoneTest />
    </MiniPage>
  </StrictMode>,
);
