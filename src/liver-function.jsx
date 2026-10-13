import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource-variable/hanken-grotesk";
import "./recall-drill/recall-drill.css";
import "./quiz/quiz.css";
import MiniPage from "./components/MiniPage.jsx";

import QuizEngine from "./components/QuizEngine.jsx";

const generateLiverFunctionCase = () => {
  const diagnoses = [
    "normal",
    "hepatocellular-injury",
    "alcoholic-liver-disease",
    "cholestasis",
    "bone-disease",
    "pre-hepatic-jaundice",
  ];
  const diagnosis = diagnoses[Math.floor(Math.random() * diagnoses.length)];

  let albumin,
    protein,
    totalBilirubin,
    ggt,
    alp,
    alt,
    ast,
    diagnosisExplanation;

  // Helper function to generate values within a range
  const randomInRange = (min, max, decimals = 0) => {
    const value = Math.random() * (max - min) + min;
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  };

  switch (diagnosis) {
    case "normal":
      albumin = randomInRange(34, 48);
      protein = randomInRange(65, 85);
      totalBilirubin = randomInRange(2, 24);
      ggt = randomInRange(15, 59);
      alp = randomInRange(30, 110);
      alt = randomInRange(10, 54);
      ast = randomInRange(10, 44);
      diagnosisExplanation =
        "All liver function tests are within normal reference ranges. This indicates normal hepatic synthetic function, bile flow, and hepatocyte integrity. No evidence of liver disease, cholestasis, or significant hepatocellular injury.";
      break;

    case "hepatocellular-injury":
      albumin = randomInRange(30, 45); // Slightly low to normal
      protein = randomInRange(60, 80);
      totalBilirubin = randomInRange(25, 60); // Elevated
      ggt = randomInRange(15, 80); // Mildly elevated
      alp = randomInRange(30, 150); // Mildly elevated
      alt = randomInRange(180, 500); // Significantly elevated
      ast = randomInRange(alt - 50, alt + 20); // Significantly elevated
      diagnosisExplanation =
        "Pattern of hepatocellular injury with elevated ALT and AST (>2x upper limit of normal). The ALT:AST ratio is approximately 1:1 or ALT > AST, suggesting acute hepatocellular damage. Causes include viral hepatitis, drug toxicity, autoimmune hepatitis, or ischemic hepatitis.";
      break;

    case "alcoholic-liver-disease":
      albumin = randomInRange(25, 40); // Often low
      protein = randomInRange(55, 75);
      totalBilirubin = randomInRange(30, 80); // Elevated
      ggt = randomInRange(50, 80); // Markedly elevated
      alp = randomInRange(70, 130); // Moderately elevated
      alt = randomInRange(180, 300); // Moderately elevated
      ast = randomInRange(alt * 2.1, alt * 3.2); // More elevated than ALT
      diagnosisExplanation =
        "Pattern consistent with alcoholic liver disease. Key features include markedly elevated GGT (most sensitive marker for alcohol use), AST > ALT ratio >2:1, and moderately elevated bilirubin. The AST predominance reflects mitochondrial damage characteristic of chronic alcohol use.";
      break;

    case "cholestasis":
      albumin = randomInRange(32, 45); // Normal to slightly low
      protein = randomInRange(62, 82);
      totalBilirubin = randomInRange(50, 200); // Significantly elevated
      ggt = randomInRange(300, 600); // Markedly elevated
      alp = randomInRange(ggt - 100, ggt + 200); // Markedly elevated
      alt = randomInRange(45, 70); // Normal to mildly elevated
      ast = randomInRange(35, 80); // Normal to mildly elevated
      diagnosisExplanation =
        "Cholestatic pattern with disproportionately elevated ALP and GGT compared to transaminases. High bilirubin indicates impaired bile flow. This pattern suggests biliary obstruction (gallstones, strictures, tumors) or intrahepatic cholestasis (primary biliary cholangitis, drug-induced cholestasis).";
      break;

    case "bone-disease":
      albumin = randomInRange(34, 48); // Normal
      protein = randomInRange(65, 85); // Normal
      totalBilirubin = randomInRange(2, 24); // Normal
      ggt = randomInRange(15, 59); // Normal
      alp = randomInRange(200, 500); // Significantly elevated
      alt = randomInRange(10, 54); // Normal
      ast = randomInRange(10, 44); // Normal
      diagnosisExplanation =
        "Isolated ALP elevation with normal GGT and other liver enzymes indicates bone-specific ALP elevation rather than hepatic origin. This pattern suggests increased bone turnover seen in Paget's disease, bone metastases, osteomalacia, or hyperparathyroidism. Normal GGT helps differentiate from liver disease.";
      break;

    case "pre-hepatic-jaundice":
      albumin = randomInRange(34, 48); // Normal
      protein = randomInRange(65, 85); // Normal
      totalBilirubin = randomInRange(40, 120); // Significantly elevated
      ggt = randomInRange(15, 59); // Normal
      alp = randomInRange(30, 110); // Normal
      alt = randomInRange(10, 54); // Normal
      ast = randomInRange(10, 44); // Normal
      diagnosisExplanation =
        "Isolated hyperbilirubinemia with normal liver enzymes indicates pre-hepatic (unconjugated) jaundice. This pattern suggests increased bilirubin production or impaired conjugation. Causes include hemolysis, ineffective erythropoiesis, Gilbert's syndrome, or Crigler-Najjar syndrome.";
      break;
  }

  // Round values appropriately
  albumin = Math.round(albumin);
  protein = Math.round(protein);
  totalBilirubin = Math.round(totalBilirubin);
  ggt = Math.round(ggt);
  alp = Math.round(alp);
  alt = Math.round(alt);
  ast = Math.round(ast);

  const ages = [28, 34, 41, 29, 52, 38, 45, 33, 47, 39];
  const genders = ["male", "female"];

  return {
    patient: {
      description: `${ages[Math.floor(Math.random() * ages.length)]}-year-old ${
        genders[Math.floor(Math.random() * genders.length)]
      }`,
      mhx: "Patient presenting for routine laboratory evaluation. Liver function tests were ordered as part of health assessment and monitoring.",
    },
    labs: [
      {
        test: "Albumin",
        result: `${albumin} g/L`,
        normal: "34-48 g/L",
      },
      {
        test: "Total Protein",
        result: `${protein} g/L`,
        normal: "65-85 g/L",
      },
      {
        test: "Total Bilirubin",
        result: `${totalBilirubin} μmol/L`,
        normal: "2-24 μmol/L",
      },
      {
        test: "GGT",
        result: `${ggt} U/L`,
        normal: "<60 U/L",
      },
      {
        test: "ALP",
        result: `${alp} U/L`,
        normal: "30-110 U/L",
      },
      {
        test: "ALT",
        result: `${alt} U/L`,
        normal: "<55 U/L",
      },
      {
        test: "AST",
        result: `${ast} U/L`,
        normal: "<45 U/L",
      },
    ],
    questions: [
      {
        type: "selectOne",
        text: "Based on the laboratory pattern, what is the most likely diagnosis?",
        options: [
          {
            id: "normal",
            text: "Normal liver function",
            description: "All parameters within normal limits",
            correct: diagnosis === "normal",
          },
          {
            id: "hepatocellular-injury",
            text: "General hepatocellular injury",
            description: "Elevated ALT/AST indicating hepatocyte damage",
            correct: diagnosis === "hepatocellular-injury",
          },
          {
            id: "alcoholic-liver-disease",
            text: "Alcoholic liver disease",
            description: "High GGT with AST > ALT pattern",
            correct: diagnosis === "alcoholic-liver-disease",
          },
          {
            id: "cholestasis",
            text: "Cholestatic liver disease",
            description: "Elevated ALP/GGT with high bilirubin",
            correct: diagnosis === "cholestasis",
          },
          {
            id: "bone-disease",
            text: "Bone disease",
            description: "Isolated ALP elevation with normal GGT",
            correct: diagnosis === "bone-disease",
          },
          {
            id: "pre-hepatic-jaundice",
            text: "Pre-hepatic jaundice",
            description: "Isolated bilirubin elevation",
            correct: diagnosis === "pre-hepatic-jaundice",
          },
        ],
        explanation: diagnosisExplanation,
      },
    ],
  };
};

const LIVER_FUNCTION_CONFIG = {
  title: "Liver Function Tests",
  description:
    "Each case presents a patient with liver function test results. Analyze the laboratory patterns to identify abnormal values and determine the underlying pathophysiology.",
  startButtonText: "Generate First Case",
  generateCase: generateLiverFunctionCase,
};

function LiverFunctionTest() {
  return <QuizEngine quizConfig={LIVER_FUNCTION_CONFIG} />;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <MiniPage
      title={LIVER_FUNCTION_CONFIG.title}
      blurb="Liver function tests assess hepatic synthetic function, bile flow, and hepatocellular integrity through measurement of enzymes, proteins, and bilirubin."
    >
      <LiverFunctionTest />
    </MiniPage>
  </StrictMode>,
);
