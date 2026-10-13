import { useState, useCallback } from "react";

function QuizEngine({ quizConfig }) {
  const [currentCase, setCurrentCase] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [submittedQuestions, setSubmittedQuestions] = useState([]);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const startNewCase = useCallback(() => {
    const newCase = quizConfig.generateCase();
    setCurrentCase(newCase);
    setCurrentQuestionIndex(0);
    setUserAnswers(new Array(newCase.questions.length).fill(null));
    setSubmittedQuestions(new Array(newCase.questions.length).fill(false));
  }, [quizConfig]);

  const handleAnswer = (questionIndex, answer) => {
    const newAnswers = [...userAnswers];
    newAnswers[questionIndex] = answer;
    setUserAnswers(newAnswers);
  };

  const submitCurrentQuestion = () => {
    const currentQuestion = currentCase.questions[currentQuestionIndex];
    const userAnswer = userAnswers[currentQuestionIndex];

    let isCorrect = false;
    if (currentQuestion.type === "selectOne") {
      const selectedOption = currentQuestion.options.find(
        (opt) => opt.id === userAnswer,
      );
      isCorrect = selectedOption?.correct === true;
    } else if (currentQuestion.type === "selectAll") {
      const correctIds = currentQuestion.options
        .filter((opt) => opt.correct)
        .map((opt) => opt.id);
      const userIds = userAnswer || [];
      isCorrect =
        correctIds.length === userIds.length &&
        correctIds.every((id) => userIds.includes(id));
    }

    if (isCorrect) {
      setScore((prev) => ({ ...prev, correct: prev.correct + 1 }));
    }
    setScore((prev) => ({ ...prev, total: prev.total + 1 }));

    // Mark this question as submitted
    const newSubmitted = [...submittedQuestions];
    newSubmitted[currentQuestionIndex] = true;
    setSubmittedQuestions(newSubmitted);

    // Automatically advance to next question after a brief delay
    setTimeout(() => {
      if (currentQuestionIndex < currentCase.questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
      }
    }, 100);
  };

  const renderPatientInfo = () => (
    <div className="qz-section">
      <h2 className="qz-title">Patient Case</h2>
      <div className="qz-case">
        <p>
          <strong>Patient:</strong> {currentCase.patient.description}
        </p>
        <p>
          <strong>Medical History:</strong> {currentCase.patient.mhx}
        </p>
      </div>
    </div>
  );

  const renderLabResults = () => (
    <div className="qz-section">
      <h2 className="qz-title">Laboratory Results</h2>
      <div className="qz-table-wrap">
        <table className="qz-table">
          <thead>
            <tr>
              <th>Test</th>
              <th>Result</th>
              {!quizConfig.hideNormalValues && <th>Normal Range</th>}
            </tr>
          </thead>
          <tbody>
            {currentCase.labs.map((lab, index) => (
              <tr key={index}>
                <td>{lab.test}</td>
                <td>{lab.result}</td>
                {!quizConfig.hideNormalValues && (
                  <td className="qz-normal">{lab.normal}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {currentCase.labsAnnotation && (
          <p className="qz-annot">{currentCase.labsAnnotation}</p>
        )}
      </div>
    </div>
  );

  const renderQuestionWithFeedback = (questionIndex) => {
    const question = currentCase.questions[questionIndex];
    const userAnswer = userAnswers[questionIndex];
    const hasAnswer = userAnswer !== null && userAnswer !== undefined;
    const isSubmitted = submittedQuestions[questionIndex];
    const isCurrentQuestion = questionIndex === currentQuestionIndex;

    return (
      <div key={questionIndex} className="qz-question">
        <h3 className="qz-text">{question.text}</h3>

        {question.type === "selectOne" && (
          <div className="qz-options">
            {question.options.map((option) => (
              <label
                key={option.id}
                className={`qz-opt${isCurrentQuestion && !isSubmitted ? "" : " locked"}`}
              >
                <input
                  type="radio"
                  name={`question-${questionIndex}`}
                  value={option.id}
                  checked={userAnswer === option.id}
                  onChange={(e) =>
                    isCurrentQuestion &&
                    !isSubmitted &&
                    handleAnswer(questionIndex, e.target.value)
                  }
                  disabled={!isCurrentQuestion || isSubmitted}
                />
                <div>
                  <b>{option.text}</b>
                  {option.description && isSubmitted && (
                    <div className="qz-opt-desc">{option.description}</div>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}

        {question.type === "selectAll" && (
          <div className="qz-options">
            {question.options.map((option) => (
              <label
                key={option.id}
                className={`qz-opt${isCurrentQuestion && !isSubmitted ? "" : " locked"}`}
              >
                <input
                  type="checkbox"
                  checked={(userAnswer || []).includes(option.id)}
                  onChange={(e) => {
                    if (isCurrentQuestion && !isSubmitted) {
                      const currentSelections = userAnswer || [];
                      const newSelections = e.target.checked
                        ? [...currentSelections, option.id]
                        : currentSelections.filter((id) => id !== option.id);
                      handleAnswer(questionIndex, newSelections);
                    }
                  }}
                  disabled={!isCurrentQuestion || isSubmitted}
                />
                <div>
                  <b>{option.text}</b>
                  {option.description && isSubmitted && (
                    <div className="qz-opt-desc">{option.description}</div>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}

        {isCurrentQuestion && !isSubmitted && (
          <div className="qz-actions">
            <button className="primary" onClick={submitCurrentQuestion}>
              Submit answer
            </button>
          </div>
        )}

        {isSubmitted && renderQuestionFeedback(questionIndex)}
      </div>
    );
  };

  const renderQuestionFeedback = (questionIndex) => {
    const question = currentCase.questions[questionIndex];
    const userAnswer = userAnswers[questionIndex];

    let isCorrect = false;
    let correctOptions = [];
    let selectedOptions = [];

    if (question.type === "selectOne") {
      const selectedOption = question.options.find(
        (opt) => opt.id === userAnswer,
      );
      const correctOption = question.options.find((opt) => opt.correct);
      isCorrect = selectedOption?.correct === true;
      correctOptions = [correctOption];
      selectedOptions = selectedOption ? [selectedOption] : [];
    } else if (question.type === "selectAll") {
      correctOptions = question.options.filter((opt) => opt.correct);
      selectedOptions = question.options.filter((opt) =>
        (userAnswer || []).includes(opt.id),
      );
      const correctIds = correctOptions.map((opt) => opt.id);
      const userIds = userAnswer || [];
      isCorrect =
        correctIds.length === userIds.length &&
        correctIds.every((id) => userIds.includes(id));
    }

    return (
      <div className={`qz-fb${isCorrect ? " ok" : ""}`} role="status">
        <h4 className="qz-fb-title">{isCorrect ? "Correct!" : "Incorrect"}</h4>
        {question.explanation}
      </div>
    );
  };

  if (!currentCase) {
    return (
      <div className="qz-intro">
        <p>{quizConfig.description}</p>
        <button className="primary" onClick={startNewCase}>
          {quizConfig.startButtonText || "Start Quiz"}
        </button>
      </div>
    );
  }

  const allQuestionsSubmitted = submittedQuestions
    .slice(0, currentQuestionIndex + 1)
    .every((submitted) => submitted === true);
  const isLastQuestion =
    currentQuestionIndex === currentCase.questions.length - 1;

  return (
    <div>
      {renderPatientInfo()}
      {renderLabResults()}

      {/* Render all questions up to and including current */}
      {currentCase.questions
        .slice(0, currentQuestionIndex + 1)
        .map((_, index) => renderQuestionWithFeedback(index))}

      {/* Show "Generate New Case" button after last question is answered */}
      {isLastQuestion && allQuestionsSubmitted && (
        <div className="qz-actions qz-next">
          <button className="primary" onClick={startNewCase}>
            Generate New Case
          </button>
        </div>
      )}
    </div>
  );
}

export default QuizEngine;
