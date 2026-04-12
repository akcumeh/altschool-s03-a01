import './Timer.css';

interface Props {
  timeLeft: number;
  total?: number;
}

export default function Timer({ timeLeft, total = 60 }: Props) {
  const pct = Math.max(0, timeLeft / total);
  const urgent = timeLeft <= 10;
  const warning = timeLeft <= 20 && timeLeft > 10;

  const barClass = urgent ? 'timer__bar--urgent' : warning ? 'timer__bar--warning' : '';

  return (
    <div className="timer">
      <div className="timer__track">
        <div
          className={`timer__bar ${barClass}`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <span className={`timer__number ${urgent ? 'timer__number--pulse' : ''}`}>
        {timeLeft}s
      </span>
    </div>
  );
}
