import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SessionCard from '../components/SessionCard';
import type { PlayerData } from '../types/game';

const gmPlayer: PlayerData = { id: 'gm1', username: 'host_1', score: 0, isGameMaster: true };

const session = {
    id: 'session-uuid',
    playerCount: 3,
    gameMasterId: 'gm1',
    players: [gmPlayer],
};

describe('SessionCard', () => {
    test('renders the game master username', () => {
        render(<SessionCard session={session} onJoin={() => {}} />);
        expect(screen.getByText('host_1')).toBeInTheDocument();
    });

    test('renders player count with plural form', () => {
        render(<SessionCard session={session} onJoin={() => {}} />);
        expect(screen.getByText('3 players waiting')).toBeInTheDocument();
    });

    test('renders player count with singular form', () => {
        render(<SessionCard session={{ ...session, playerCount: 1 }} onJoin={() => {}} />);
        expect(screen.getByText('1 player waiting')).toBeInTheDocument();
    });

    test('renders a Join button', () => {
        render(<SessionCard session={session} onJoin={() => {}} />);
        expect(screen.getByRole('button', { name: /join/i })).toBeInTheDocument();
    });

    test('calls onJoin when Join button is clicked', async () => {
        const onJoin = vi.fn();
        render(<SessionCard session={session} onJoin={onJoin} />);
        await userEvent.click(screen.getByRole('button', { name: /join/i }));
        expect(onJoin).toHaveBeenCalledTimes(1);
    });

    test('shows "Unknown" when the GM player is not in the players list', () => {
        const sessionNoGm = { ...session, gameMasterId: 'not-in-list' };
        render(<SessionCard session={sessionNoGm} onJoin={() => {}} />);
        expect(screen.getByText('Unknown')).toBeInTheDocument();
    });
});
