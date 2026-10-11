import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

import "@fontsource-variable/hanken-grotesk";
import "@fontsource-variable/bricolage-grotesque";

import QuizEngine from "./components/QuizEngine.jsx";
import { getArrowForDirection } from "./utils/labUtils.jsx";

const getDiagnosisInfo = (diagnosis) => {
  const info = {
    "primary-hyperparathyroidism": {
      title: "Primary Hyperparathyroidism",
      explanation:
        "Elevated calcium with inappropriately elevated PTH indicates autonomous parathyroid hormone production, typically from a parathyroid adenoma (85%) or hyperplasia. Key differentiator: occurs in patients WITHOUT chronic kidney disease history. The parathyroid glands are producing excess PTH despite high calcium levels.",
      pattern: "↑ Calcium, ↑ PTH (no CKD history)",
      pathophysiology:
        "Parathyroid adenoma or hyperplasia → excessive PTH → increased bone resorption and renal calcium retention → hypercalcemia",
      phosphate:
        "Phosphate will decrease. Increased calcium will decrease phosphate reabsorption in the kidneys, leading to increased phosphate excretion.",
    },
    "secondary-hyperparathyroidism": {
      title: "Secondary Hyperparathyroidism",
      explanation:
        "Low calcium with elevated PTH represents an appropriate physiological response. The parathyroid glands are working correctly to compensate for low calcium due to vitamin D deficiency, malabsorption, or chronic kidney disease.",
      pattern: "↓ Calcium, ↑ PTH",
      pathophysiology:
        "Low calcium (from CKD, vitamin D deficiency, malabsorption) → stimulates parathyroid glands → appropriate ↑ PTH response",
      phosphate:
        "Phosphate will increase. Decreased calcium will increase phosphate reabsorption in the kidneys, leading to decreased phosphate excretion.",
    },
    "tertiary-hyperparathyroidism": {
      title: "Tertiary Hyperparathyroidism",
      explanation:
        "Elevated calcium with elevated PTH in a patient WITH chronic kidney disease history. The parathyroid glands became autonomous after years of secondary hyperparathyroidism and continue producing excess PTH despite corrected calcium levels. Critical: requires CKD history to differentiate from primary.",
      pattern: "↑ Calcium, ↑ PTH (with CKD history)",
      pathophysiology:
        "Years of secondary hyperparathyroidism in CKD → parathyroid gland autonomy → persistent ↑ PTH despite normalized calcium",
      phosphate:
        "Phosphate will increase. A terminally biased parathyroid-bone-kidney feedback loop drives increased phosphate reabsorption, despite high calcium.",
    },
    hypoparathyroidism: {
      title: "Hypoparathyroidism",
      explanation:
        "Low calcium with inappropriately low PTH indicates inadequate parathyroid hormone production. This is commonly seen after thyroid/parathyroid surgery, autoimmune destruction, or genetic causes. The parathyroid glands are not responding appropriately to hypocalcemia.",
      pattern: "↓ Calcium, ↓ PTH",
      pathophysiology:
        "Parathyroid gland damage/removal → insufficient PTH → decreased bone resorption and renal calcium retention → hypocalcemia",
      phosphate:
        "Phosphate will increase. Decreased calcium leads to decreased phosphate excretion in the kidneys.",
    },
    osteomalacia: {
      title: "Osteomalacia",
      explanation:
        "Low calcium with elevated PTH in an adult patient indicates vitamin D deficiency. The parathyroid glands are responding appropriately to hypocalcemia caused by impaired intestinal calcium absorption. This represents secondary hyperparathyroidism due to vitamin D deficiency in adults.",
      pattern: "↓ Calcium, ↑ PTH (adult)",
      pathophysiology:
        "Vitamin D deficiency → decreased intestinal calcium absorption → hypocalcemia → appropriate ↑ PTH response",
      phosphate:
        "Phosphate will decrease. Vitamin D deficiency impairs phosphate absorption, and elevated PTH further decreases renal phosphate reabsorption.",
    },
    rickets: {
      title: "Rickets",
      explanation:
        "Low calcium with elevated PTH in a pediatric patient indicates vitamin D deficiency. The parathyroid glands are responding appropriately to hypocalcemia caused by impaired intestinal calcium absorption. This is the same pathophysiology as osteomalacia but occurs in children.",
      pattern: "↓ Calcium, ↑ PTH (pediatric)",
      pathophysiology:
        "Vitamin D deficiency → decreased intestinal calcium absorption → hypocalcemia → appropriate ↑ PTH response",
      phosphate:
        "Phosphate will decrease. Vitamin D deficiency impairs phosphate absorption, and elevated PTH further decreases renal phosphate reabsorption.",
    },
  };
  return info[diagnosis];
};

const parathyroidQuizConfig = {
  description:
    "Each case presents a patient with suspected parathyroid dysfunction. Analyze the calcium and PTH patterns using directional arrows to determine the underlying pathophysiology and make the correct diagnosis.",
  startButtonText: "Generate First Case",
  hideNormalValues: true,
  generateCase: () => {
    const diagnoses = [
      "primary-hyperparathyroidism",
      "secondary-hyperparathyroidism",
      "tertiary-hyperparathyroidism",
      "hypoparathyroidism",
      "osteomalacia",
      "rickets",
    ];
    const diagnosis = diagnoses[Math.floor(Math.random() * diagnoses.length)];

    const ages = [25, 32, 28, 45, 38, 52, 41, 29, 36, 48, 65, 72];
    const genders = ["Male", "Female"];

    let clinicalContext = "";
    let medicalHistory = "";
    let calciumDirection = "";
    let pthDirection = "";

    switch (diagnosis) {
      case "primary-hyperparathyroidism":
        calciumDirection = "elevated";
        pthDirection = "elevated";
        const primaryContexts = [
          "Routine blood work for fatigue and recurrent kidney stones",
          "Evaluation for osteoporosis after fragility fracture (normal kidney function)",
          "Workup for depression and confusion in previously healthy patient",
          "Investigation of recurrent nephrolithiasis (no known CKD)",
          "Screening labs showing hypercalcemia in healthy individual",
        ];
        const primaryHistories = [
          "No significant past medical history, normal kidney function",
          "No chronic kidney disease or metabolic bone disease",
          "Previously healthy with normal renal function",
          "No history of kidney disease or vitamin D deficiency",
        ];
        clinicalContext =
          primaryContexts[Math.floor(Math.random() * primaryContexts.length)];
        medicalHistory =
          primaryHistories[Math.floor(Math.random() * primaryHistories.length)];
        break;

      case "secondary-hyperparathyroidism":
        calciumDirection = "decreased";
        pthDirection = "elevated";
        const secondaryContexts = [
          "Chronic kidney disease patient with bone pain and muscle weakness",
          "Severe vitamin D deficiency with tetany episodes",
          "Malabsorption syndrome with hypocalcemic symptoms",
          "CKD stage 4 patient with elevated phosphate and low calcium",
          "Patient with intestinal malabsorption and vitamin D deficiency",
        ];
        const secondaryHistories = [
          "Chronic kidney disease stage 4, declining renal function",
          "Severe vitamin D deficiency, poor dietary intake",
          "Inflammatory bowel disease with malabsorption",
          "Progressive chronic kidney disease over 5 years",
        ];
        clinicalContext =
          secondaryContexts[
            Math.floor(Math.random() * secondaryContexts.length)
          ];
        medicalHistory =
          secondaryHistories[
            Math.floor(Math.random() * secondaryHistories.length)
          ];
        break;

      case "tertiary-hyperparathyroidism":
        calciumDirection = "elevated";
        pthDirection = "elevated";
        const tertiaryContexts = [
          "Post-kidney transplant patient with persistent hypercalcemia",
          "Long-term dialysis patient with autonomous parathyroid function",
          "CKD patient with hypercalcemia after years of secondary hyperparathyroidism",
          "Post-renal transplant with continued inappropriate PTH elevation",
          "Former dialysis patient with persistent hyperparathyroidism",
        ];
        const tertiaryHistories = [
          "15-year history of chronic kidney disease, previously on dialysis",
          "Long-standing CKD with 8 years of secondary hyperparathyroidism",
          "Chronic kidney disease stage 5, post-transplant 2 years ago",
          "10+ year history of CKD and prolonged secondary hyperparathyroidism",
          "End-stage renal disease, kidney transplant 18 months ago",
        ];
        clinicalContext =
          tertiaryContexts[Math.floor(Math.random() * tertiaryContexts.length)];
        medicalHistory =
          tertiaryHistories[
            Math.floor(Math.random() * tertiaryHistories.length)
          ];
        break;

      case "hypoparathyroidism":
        calciumDirection = "decreased";
        pthDirection = "decreased";
        const hypoContexts = [
          "Post-thyroidectomy patient with perioral numbness and tetany",
          "Patient with positive Chvostek's and Trousseau's signs",
          "Autoimmune polyglandular syndrome with hypocalcemic symptoms",
          "Post-surgical neck exploration with carpopedal spasms",
          "Patient with paresthesias and muscle cramps after parathyroid surgery",
        ];
        const hypoHistories = [
          "Recent total thyroidectomy for thyroid cancer",
          "Autoimmune polyglandular syndrome type 1",
          "Post-surgical parathyroid gland removal",
          "History of neck surgery with inadvertent parathyroid damage",
        ];
        clinicalContext =
          hypoContexts[Math.floor(Math.random() * hypoContexts.length)];
        medicalHistory =
          hypoHistories[Math.floor(Math.random() * hypoHistories.length)];
        break;

      case "osteomalacia":
        calciumDirection = "decreased";
        pthDirection = "elevated";
        const osteomalaciaContexts = [
          "Routine blood work for fatigue and weakness",
          "Metabolic panel during annual physical examination",
          "Laboratory workup for muscle weakness",
          "Blood tests for unexplained fatigue",
          "Routine screening laboratory studies",
        ];
        const osteomalaciaHistories = [
          "Limited sun exposure, otherwise healthy adult",
          "No significant past medical history, indoor lifestyle",
          "No chronic kidney disease or malabsorption",
          "Healthy adult with minimal vitamin D intake",
        ];
        clinicalContext =
          osteomalaciaContexts[
            Math.floor(Math.random() * osteomalaciaContexts.length)
          ];
        medicalHistory =
          osteomalaciaHistories[
            Math.floor(Math.random() * osteomalaciaHistories.length)
          ];
        break;

      case "rickets":
        calciumDirection = "decreased";
        pthDirection = "elevated";
        const ricketsContexts = [
          "Pediatric screening blood work",
          "Laboratory studies during routine pediatric visit",
          "Blood tests for growth monitoring",
          "Metabolic panel in pediatric patient",
          "Routine laboratory screening in child",
        ];
        const ricketsHistories = [
          "Healthy child with limited sun exposure",
          "No significant past medical history in pediatric patient",
          "Normal growth and development, indoor activities",
          "Healthy child with minimal vitamin D supplementation",
        ];
        clinicalContext =
          ricketsContexts[Math.floor(Math.random() * ricketsContexts.length)];
        medicalHistory =
          ricketsHistories[Math.floor(Math.random() * ricketsHistories.length)];
        break;

      default:
        calciumDirection = "normal";
        pthDirection = "normal";
        clinicalContext = "Routine metabolic panel";
        medicalHistory = "No significant past medical history";
    }

    let age;
    if (diagnosis === "rickets") {
      const pediatricAges = [3, 5, 7, 9, 11, 13, 15, 17];
      age = pediatricAges[Math.floor(Math.random() * pediatricAges.length)];
    } else {
      age = ages[Math.floor(Math.random() * ages.length)];
    }
    const gender = genders[Math.floor(Math.random() * genders.length)];

    return {
      patient: {
        description: `${age}-year-old ${gender.toLowerCase()}`,
        mhx: medicalHistory,
        clinicalContext,
      },
      labs: [
        {
          test: "Serum Calcium",
          result: getArrowForDirection(calciumDirection),
          normal: (
            <>
              8.5-10.5 mg/dL
              <br />
              <span className="text-xs">(2.1-2.6 mmol/L)</span>
            </>
          ),
        },
        {
          test: "Parathyroid Hormone (PTH)",
          result: getArrowForDirection(pthDirection),
          normal: (
            <>
              15-65 pg/mL
              <br />
              <span className="text-xs">(1.6-6.9 pmol/L)</span>
            </>
          ),
        },
      ],
      labsAnnotation: (
        <>
          <strong>Legend:</strong> ↑ = Elevated, ↓ = Decreased, → = Normal
        </>
      ),
      questions: [
        {
          text: "Select the most likely diagnosis:",
          type: "selectOne",
          options: [
            {
              id: "primary-hyperparathyroidism",
              text: "Primary Hyperparathyroidism",
              description: "Parathyroid adenoma/hyperplasia",
              correct: diagnosis === "primary-hyperparathyroidism",
            },
            {
              id: "secondary-hyperparathyroidism",
              text: "Secondary Hyperparathyroidism",
              description: "Appropriate response to hypocalcemia",
              correct: diagnosis === "secondary-hyperparathyroidism",
            },
            {
              id: "tertiary-hyperparathyroidism",
              text: "Tertiary Hyperparathyroidism",
              description: "Autonomous PTH after chronic secondary",
              correct: diagnosis === "tertiary-hyperparathyroidism",
            },
            {
              id: "hypoparathyroidism",
              text: "Hypoparathyroidism",
              description: "Inadequate PTH production",
              correct: diagnosis === "hypoparathyroidism",
            },
            {
              id: "osteomalacia",
              text: "Osteomalacia",
              description: "Vitamin D deficiency in adults",
              correct: diagnosis === "osteomalacia",
            },
            {
              id: "rickets",
              text: "Rickets",
              description: "Vitamin D deficiency in children",
              correct: diagnosis === "rickets",
            },
          ],
          explanation: (
            <div>
              <p className="mb-3">
                <strong>Correct answer:</strong>{" "}
                {getDiagnosisInfo(diagnosis).title}
              </p>
              <p className="mb-3">{getDiagnosisInfo(diagnosis).explanation}</p>
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-sm font-medium mb-2 text-blue-800">
                  Expected pattern: {getDiagnosisInfo(diagnosis).pattern}
                </p>
                <p className="text-xs text-blue-700">
                  <strong>Pathophysiology:</strong>{" "}
                  {getDiagnosisInfo(diagnosis).pathophysiology}
                </p>
              </div>
            </div>
          ),
        },
        {
          text: "What will the effect on phosphate (PO₄) be?",
          type: "selectOne",
          options: [
            {
              id: "increased",
              text: "↑ PO₄",
              correct:
                diagnosis !== "primary-hyperparathyroidism" &&
                diagnosis !== "osteomalacia" &&
                diagnosis !== "rickets",
            },
            {
              id: "decreased",
              text: "↓ PO₄",
              correct:
                diagnosis === "primary-hyperparathyroidism" ||
                diagnosis === "osteomalacia" ||
                diagnosis === "rickets",
            },
          ],
          explanation: getDiagnosisInfo(diagnosis).phosphate,
        },
      ],
    };
  },
};

function ParathyroidTest() {
  return <QuizEngine quizConfig={parathyroidQuizConfig} />;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <div className="min-h-screen text-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="text-left mb-8">
          <a
            href="/"
            className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
          >
            ← Back to Tests
          </a>
          <h1 className="font-serif text-3xl font-bold text-gray-800 mb-4">
            Parathyroid Function Test
          </h1>
          <p className="text-gray-600">
            Practice interpreting calcium and PTH levels to diagnose parathyroid
            disorders
          </p>
        </header>

        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200 text-left">
          <ParathyroidTest />
        </div>
      </div>
    </div>
  </StrictMode>,
);
