import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomePage from '../pages/HomePage';

vi.mock('react-router-dom', () => ({
    useNavigate: () => vi.fn(),
}));

vi.mock('../hooks/useSocket', () => ({
    getSocket: () => ({ emit: vi.fn(), once: vi.fn(), off: vi.fn() }),
    resetSocket: vi.fn(),
}));

describe('HomePage', () => {
    test('renders the Create Game button', () => {
        render(<HomePage />);
        expect(screen.getByRole('button', { name: /create game/i })).toBeInTheDocument();
    });

    test('renders the Browse Sessions button', () => {
        render(<HomePage />);
        expect(screen.getByRole('button', { name: /browse sessions/i })).toBeInTheDocument();
    });

    test('renders the username input', () => {
        render(<HomePage />);
        expect(screen.getByPlaceholderText(/enter username/i)).toBeInTheDocument();
    });

    test('shows error when username is too short on Create Game click', async () => {
        render(<HomePage />);
        await userEvent.type(screen.getByPlaceholderText(/enter username/i), 'a');
        await userEvent.click(screen.getByRole('button', { name: /create game/i }));
        expect(screen.getByText(/at least 2 characters/i)).toBeInTheDocument();
    });

    test('shows error when username is too short on Browse Sessions click', async () => {
        render(<HomePage />);
        await userEvent.type(screen.getByPlaceholderText(/enter username/i), 'x');
        await userEvent.click(screen.getByRole('button', { name: /browse sessions/i }));
        expect(screen.getByText(/at least 2 characters/i)).toBeInTheDocument();
    });

    test('shows error when username exceeds 20 characters', () => {
        render(<HomePage />);
        const input = screen.getByPlaceholderText(/enter username/i);
        // fireEvent bypasses maxLength so we can test the > 20 branch
        fireEvent.change(input, { target: { value: 'a'.repeat(21) } });
        fireEvent.click(screen.getByRole('button', { name: /create game/i }));
        expect(screen.getByText(/20 characters or less/i)).toBeInTheDocument();
    });

    test('clears error when user starts typing after an error', async () => {
        render(<HomePage />);
        const input = screen.getByPlaceholderText(/enter username/i);
        await userEvent.type(input, 'a');
        await userEvent.click(screen.getByRole('button', { name: /create game/i }));
        expect(screen.getByText(/at least 2 characters/i)).toBeInTheDocument();
        await userEvent.type(input, 'b');
        expect(screen.queryByText(/at least 2 characters/i)).not.toBeInTheDocument();
    });

    test('no error is shown on initial render', () => {
        render(<HomePage />);
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
});
