import { render, screen } from '@testing-library/react';
import QuestionCard from '../components/QuestionCard';

describe('QuestionCard', () => {
    test('renders the question text', () => {
        render(<QuestionCard question="What is the capital of France?" />);
        expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
    });

    test('renders the "Guess the answer" label', () => {
        render(<QuestionCard question="Any question?" />);
        expect(screen.getByText('Guess the answer')).toBeInTheDocument();
    });

    test('renders different question text correctly', () => {
        render(<QuestionCard question="What colour is the sky?" />);
        expect(screen.getByText('What colour is the sky?')).toBeInTheDocument();
    });
});
