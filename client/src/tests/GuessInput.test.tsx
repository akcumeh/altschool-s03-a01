import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GuessInput from '../components/GuessInput';

describe('GuessInput', () => {
    test('renders input and submit button', () => {
        render(<GuessInput onSubmit={() => {}} />);
        expect(screen.getByRole('textbox', { name: /your guess/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    });

    test('submit button is disabled when input is empty', () => {
        render(<GuessInput onSubmit={() => {}} />);
        expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled();
    });

    test('submit button is disabled when disabled prop is true', () => {
        render(<GuessInput onSubmit={() => {}} disabled />);
        expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled();
    });

    test('input is disabled when disabled prop is true', () => {
        render(<GuessInput onSubmit={() => {}} disabled />);
        expect(screen.getByRole('textbox', { name: /your guess/i })).toBeDisabled();
    });

    test('placeholder changes when disabled', () => {
        render(<GuessInput onSubmit={() => {}} disabled />);
        expect(screen.getByPlaceholderText('Cannot guess right now')).toBeInTheDocument();
    });

    test('calls onSubmit with trimmed value', async () => {
        const onSubmit = vi.fn();
        render(<GuessInput onSubmit={onSubmit} />);
        const input = screen.getByRole('textbox', { name: /your guess/i });
        await userEvent.type(input, 'Paris');
        await userEvent.click(screen.getByRole('button', { name: /submit/i }));
        expect(onSubmit).toHaveBeenCalledWith('Paris');
    });

    test('clears input after submission', async () => {
        render(<GuessInput onSubmit={() => {}} />);
        const input = screen.getByRole('textbox', { name: /your guess/i });
        await userEvent.type(input, 'Paris');
        await userEvent.click(screen.getByRole('button', { name: /submit/i }));
        expect(input).toHaveValue('');
    });

    test('does not call onSubmit when input is only whitespace', async () => {
        const onSubmit = vi.fn();
        render(<GuessInput onSubmit={onSubmit} />);
        const input = screen.getByRole('textbox', { name: /your guess/i });
        await userEvent.type(input, '   ');
        // button remains disabled for whitespace-only input
        expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled();
        expect(onSubmit).not.toHaveBeenCalled();
    });

    test('renders 3 attempt dots', () => {
        const { container } = render(<GuessInput onSubmit={() => {}} attemptsLeft={3} />);
        expect(container.querySelectorAll('.guess-input__dot')).toHaveLength(3);
    });

    test('filled dots match attemptsLeft', () => {
        const { container } = render(<GuessInput onSubmit={() => {}} attemptsLeft={2} />);
        expect(container.querySelectorAll('.guess-input__dot--filled')).toHaveLength(2);
    });

    test('shows singular attempt label when 1 attempt left', () => {
        render(<GuessInput onSubmit={() => {}} attemptsLeft={1} />);
        expect(screen.getByText('1 attempt left')).toBeInTheDocument();
    });

    test('shows plural attempts label when multiple attempts left', () => {
        render(<GuessInput onSubmit={() => {}} attemptsLeft={2} />);
        expect(screen.getByText('2 attempts left')).toBeInTheDocument();
    });
});
