// This is probably some of the worst code I (my AI) has ever written.
// It barely works, but that's about it. Touch it and it may break.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource-variable/hanken-grotesk";
import "./recall-drill/recall-drill.css";
import "./quiz/quiz.css";
import MiniPage from "./components/MiniPage.jsx";

import QuizEngine from "./components/QuizEngine.jsx";

const generateBacteriaCase = () => {
  const allSpecies = [
    "Staph aureus",
    "Staph epidermidis",
    "Strep pneumoniae",
    "Strep pyogenes",
    "Strep agalactiae",
    "E. coli",
    "Pseudomonas",
    "Salmonella",
  ];

  const species = allSpecies[Math.floor(Math.random() * allSpecies.length)];

  const speciesOptions = [
    {
      id: "staph-aureus",
      text: "Staphylococcus aureus",
      correct: species === "Staph aureus",
    },
    {
      id: "staph-epidermidis",
      text: "Staphylococcus epidermidis",
      correct: species === "Staph epidermidis",
    },
    {
      id: "strep-pneumoniae",
      text: "Streptococcus pneumoniae",
      correct: species === "Strep pneumoniae",
    },
    {
      id: "strep-pyogenes",
      text: "Streptococcus pyogenes",
      correct: species === "Strep pyogenes",
    },
    {
      id: "strep-agalactiae",
      text: "Streptococcus agalactiae",
      correct: species === "Strep agalactiae",
    },
    {
      id: "e-coli",
      text: "Escherichia coli",
      correct: species === "E. coli",
    },
    {
      id: "pseudomonas",
      text: "Pseudomonas aeruginosa",
      correct: species === "Pseudomonas",
    },
    {
      id: "salmonella",
      text: "Salmonella species",
      correct: species === "Salmonella",
    },
  ];

  // Generate patient demographics
  const ages = [25, 32, 28, 45, 38, 52, 41, 29, 36, 48, 65, 72];
  const genders = ["male", "female"];
  const age = ages[Math.floor(Math.random() * ages.length)];
  const gender = genders[Math.floor(Math.random() * genders.length)];

  const patientContexts = [
    "sepsis and fever",
    "pneumonia and respiratory distress",
    "wound infection",
    "urinary tract infection",
    "bacteremia",
    "cellulitis and skin infection",
  ];
  const patientContext =
    patientContexts[Math.floor(Math.random() * patientContexts.length)];

  if (species.includes("Staph")) {
    return {
      patient: {
        description: `${age}-year-old ${gender}`,
        mhx: `Presents with ${patientContext}. Blood cultures have grown bacteria after 18 hours of incubation.`,
      },
      labs: [
        {
          test: "Gram Stain",
          result: `Gram positive cocci`,
        },
        {
          test: "Colony Morphology",
          result: `Small, round clusters`,
        },
      ],
      questions: [
        {
          type: "selectOne",
          text: "Based on the Gram stain results, what is the most appropriate next test?",
          options: [
            {
              id: "coagulase",
              text: "Coagulase test",
              correct: true,
            },
            {
              id: "lancefield",
              text: "Lancefield grouping",
              correct: false,
            },
            {
              id: "oxidase",
              text: "Oxidase test",
              correct: false,
            },
            {
              id: "haemolysis",
              text: "Haemolysis on BAP",
              correct: false,
            },
            {
              id: "mac",
              text: "MacConkey agar",
              correct: false,
            },
          ],
        },
        {
          type: "selectOne",
          text: `Coagulase result: ${
            species === "Staph aureus" ? "Positive" : "Negative"
          }. What is your identification?`,
          options: speciesOptions,
          explanation:
            "Staphylococci are gram-positive cocci in clusters. Differentiate S. aureus and S. epidermidis using a coagulase test, or clinical features.",
        },
      ],
    };
  }

  if (species === "Strep pneumoniae") {
    return {
      patient: {
        description: `${age}-year-old ${gender}`,
        mhx: `Presents with ${patientContext}. Blood cultures have grown bacteria after 18 hours of incubation.`,
      },
      labs: [
        {
          test: "Gram Stain",
          result: `Gram positive cocci`,
        },
        {
          test: "Colony Morphology",
          result: `Chains`,
        },
      ],
      questions: [
        {
          type: "selectOne",
          text: "Based on the Gram stain results, what is the most appropriate next test?",
          options: [
            {
              id: "coagulase",
              text: "Coagulase test",
              correct: false,
            },
            {
              id: "lancefield",
              text: "Lancefield grouping",
              correct: false,
            },
            {
              id: "oxidase",
              text: "Oxidase test",
              correct: false,
            },
            {
              id: "haemolysis",
              text: "Haemolysis on BAP",
              correct: true,
            },
            {
              id: "mac",
              text: "MacConkey agar",
              correct: false,
            },
          ],
          explanation: "Haemolysis result: alpha-haemolytic (greening)",
        },
        {
          type: "selectOne",
          text: "What is the causative agent?",
          options: speciesOptions,
          explanation:
            "Streptococci are divided into alpha and beta-haemolytic groups. The most common alpha-haemolytic streptococcus is S. pneumoniae.",
        },
      ],
    };
  }

  if (species === "Strep pyogenes" || species === "Strep agalactiae") {
    return {
      patient: {
        description: `${age}-year-old ${gender}`,
        mhx: `Presents with ${patientContext}. Blood cultures have grown bacteria after 18 hours of incubation.`,
      },
      labs: [
        {
          test: "Gram Stain",
          result: `Gram positive cocci`,
        },
        {
          test: "Colony Morphology",
          result: `Chains`,
        },
      ],
      questions: [
        {
          type: "selectOne",
          text: "Based on the Gram stain results, what is the most appropriate next test?",
          options: [
            {
              id: "coagulase",
              text: "Coagulase test",
              correct: false,
            },
            {
              id: "lancefield",
              text: "Lancefield grouping",
              correct: false,
            },
            {
              id: "oxidase",
              text: "Oxidase test",
              correct: false,
            },
            {
              id: "haemolysis",
              text: "Haemolysis on BAP",
              correct: true,
            },
            {
              id: "mac",
              text: "MacConkey agar",
              correct: false,
            },
          ],
          explanation: "Haemolysis result: beta-haemolytic (clear)",
        },
        {
          type: "selectOne",
          text: "What is the next most appropriate test?",
          options: [
            {
              id: "coagulase",
              text: "Coagulase test",
              correct: false,
            },
            {
              id: "lancefield",
              text: "Lancefield grouping",
              correct: true,
            },
            {
              id: "oxidase",
              text: "Oxidase test",
              correct: false,
            },
            {
              id: "optochin",
              text: "Optochin sensitivity",
              correct: false,
            },
            {
              id: "catalase",
              text: "Catalase test",
              correct: false,
            },
          ],
          explanation: `Lancefield grouping result: ${
            species === "Strep pyogenes" ? "Group A" : "Group B"
          }`,
        },
        {
          type: "selectOne",
          text: "What is the causative agent?",
          options: speciesOptions,
          explanation:
            "Beta-hemolytic streptococci create clear zones of hemolysis on blood agar. Group A (S. pyogenes) and Group B (S. agalactiae) are differentiated using Lancefield grouping based on their C carbohydrate antigens.",
        },
      ],
    };
  }

  if (species === "E. coli") {
    return {
      patient: {
        description: `${age}-year-old ${gender}`,
        mhx: `Presents with ${patientContext}. Blood cultures have grown bacteria after 18 hours of incubation.`,
      },
      labs: [
        {
          test: "Gram Stain",
          result: `Gram negative rods`,
        },
        {
          test: "Colony Morphology",
          result: `Small, non-pigmented colonies`,
        },
      ],
      questions: [
        {
          type: "selectOne",
          text: "Based on the Gram stain results, what is the most appropriate next test?",
          options: [
            {
              id: "coagulase",
              text: "Coagulase test",
              correct: false,
            },
            {
              id: "lancefield",
              text: "Lancefield grouping",
              correct: false,
            },
            {
              id: "oxidase",
              text: "Oxidase test",
              correct: false,
            },
            {
              id: "haemolysis",
              text: "Haemolysis on BAP",
              correct: false,
            },
            {
              id: "mac",
              text: "MacConkey agar",
              correct: true,
            },
          ],
          explanation: "MAC result: pink/red colonies.",
        },
        {
          type: "selectOne",
          text: "What is the causative agent?",
          options: speciesOptions,
          explanation:
            "Gram-negative rods are first tested on MacConkey agar to differentiate lactose fermenters from non-fermenters. E. coli ferments lactose, producing pink/red colonies due to acid production and pH indicator change.",
        },
      ],
    };
  }

  if (species === "Pseudomonas" || species === "Salmonella") {
    return {
      patient: {
        description: `${age}-year-old ${gender}`,
        mhx: `Presents with ${patientContext}. Blood cultures have grown bacteria after 18 hours of incubation.`,
      },
      labs: [
        {
          test: "Gram Stain",
          result: `Gram negative rods`,
        },
        {
          test: "Colony Morphology",
          result:
            species === "Pseudomonas"
              ? `Large colonies with green pigment and grape-like odor`
              : `Small, non-pigmented colonies`,
        },
      ],
      questions: [
        {
          type: "selectOne",
          text: "Based on the Gram stain results, what is the most appropriate next test?",
          options: [
            {
              id: "coagulase",
              text: "Coagulase test",
              correct: false,
            },
            {
              id: "lancefield",
              text: "Lancefield grouping",
              correct: false,
            },
            {
              id: "oxidase",
              text: "Oxidase test",
              correct: false,
            },
            {
              id: "haemolysis",
              text: "Haemolysis on BAP",
              correct: false,
            },
            {
              id: "mac",
              text: "MacConkey agar",
              correct: true,
            },
          ],
          explanation: "MAC result: colourless colonies.",
        },
        {
          type: "selectOne",
          text: "What is the next most appropriate test?",
          options: [
            {
              id: "coagulase",
              text: "Coagulase test",
              correct: false,
            },
            {
              id: "lancefield",
              text: "Lancefield grouping",
              correct: false,
            },
            {
              id: "oxidase",
              text: "Oxidase test",
              correct: true,
            },
            {
              id: "haemolysis",
              text: "Haemolysis on BAP",
              correct: false,
            },
            {
              id: "catalase",
              text: "Catalase test",
              correct: false,
            },
          ],
          explanation: `Oxidase result: ${
            species === "Pseudomonas" ? "Positive" : "Negative"
          }`,
        },
        {
          type: "selectOne",
          text: "What is the causative agent?",
          options: speciesOptions,
          explanation:
            "Both Pseudomonas and Salmonella are lactose non-fermenters (colourless on MacConkey). The oxidase test differentiates them: Pseudomonas is oxidase positive due to cytochrome c oxidase, while Salmonella is oxidase negative.",
        },
      ],
    };
  }
};

const bacteriaQuizConfig = {
  title: "Bacterial Identification",
  description:
    "Practice identifying bacterial species using laboratory tests and biochemical characteristics. Each case presents a clinical scenario with step-by-step identification.",
  startButtonText: "Generate First Case",
  hideNormalValues: true,
  generateCase: generateBacteriaCase,
};

function BacteriaTest() {
  return <QuizEngine quizConfig={bacteriaQuizConfig} />;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <MiniPage
      title={"Bacterial Identification"}
      blurb="Identify bacterial species based on lab tests."
    >
      <BacteriaTest />
    </MiniPage>
  </StrictMode>,
);
