import { useState } from 'react';
import './GuessInput.css';

interface Props {
    onSubmit: (guess: string) => void;
    disabled?: boolean;
    attemptsLeft?: number;
}

const MAX_ATTEMPTS = 3;

export default function GuessInput({ onSubmit, disabled = false, attemptsLeft = MAX_ATTEMPTS }: Props) {
    const [value, setValue] = useState('');

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = value.trim();
        if (!trimmed || disabled) return;
        onSubmit(trimmed);
        setValue('');
    }

    return (
        <form className="guess-input" onSubmit={handleSubmit}>
            <div className="guess-input__row">
                <input
                    className="guess-input__field"
                    type="text"
                    placeholder={disabled ? 'Cannot guess right now' : 'Type your answer...'}
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    disabled={disabled}
                    maxLength={100}
                    aria-label="Your guess"
                />
                <button
                    className="guess-input__btn"
                    type="submit"
                    disabled={disabled || !value.trim()}
                >
                    Submit
                </button>
            </div>
            <div className="guess-input__attempts" aria-label={`${attemptsLeft} attempts remaining`}>
                {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                    <span
                        key={i}
                        className={`guess-input__dot ${i < attemptsLeft ? 'guess-input__dot--filled' : ''}`}
                    />
                ))}
                <span className="guess-input__attempts-label">
                    {attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} left
                </span>
            </div>
        </form>
    );
}
