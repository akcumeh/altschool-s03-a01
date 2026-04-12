import './QuestionCard.css';

interface Props {
  question: string;
}

export default function QuestionCard({ question }: Props) {
  return (
    <div className="question-card">
      <p className="question-card__label">Guess the answer</p>
      <p className="question-card__text">{question}</p>
    </div>
  );
}
