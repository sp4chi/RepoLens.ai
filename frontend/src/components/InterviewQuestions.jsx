// frontend/src/components/InterviewQuestions.jsx
export default function InterviewQuestions({ questions }) {
    if (!questions?.length) return null;
    return (
      <div className="interview-questions">
        <h3>Interview Questions</h3>
        <ol>
          {questions.map((q, i) => (
            <li key={i}>
              <p className="question">{q.question}</p>
              <p className="hint">{q.whatGoodAnswerLooksLike}</p>
            </li>
          ))}
        </ol>
      </div>
    );
  }