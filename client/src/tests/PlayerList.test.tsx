import { render, screen } from '@testing-library/react';
import PlayerList from '../components/PlayerList';
import type { PlayerData } from '../types/game';

const players: PlayerData[] = [
    { id: 'p1', username: 'Alice', score: 100, isGameMaster: false },
    { id: 'p2', username: 'Bob', score: 50, isGameMaster: false },
    { id: 'p3', username: 'Charlie', score: 75, isGameMaster: false },
];

describe('PlayerList', () => {
    test('renders all player usernames', () => {
        render(<PlayerList players={players} gameMasterId={null} />);
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
        expect(screen.getByText('Charlie')).toBeInTheDocument();
    });

    test('shows player count in title', () => {
        render(<PlayerList players={players} gameMasterId={null} />);
        expect(screen.getByText('3')).toBeInTheDocument();
    });

    test('shows score for each player', () => {
        render(<PlayerList players={players} gameMasterId={null} />);
        expect(screen.getByText('100 pts')).toBeInTheDocument();
        expect(screen.getByText('50 pts')).toBeInTheDocument();
        expect(screen.getByText('75 pts')).toBeInTheDocument();
    });

    test('renders crown icon next to game master', () => {
        const { container } = render(<PlayerList players={players} gameMasterId="p1" />);
        expect(container.querySelectorAll('.player-card__crown')).toHaveLength(1);
    });

    test('does not render crown when gameMasterId is null', () => {
        const { container } = render(<PlayerList players={players} gameMasterId={null} />);
        expect(container.querySelectorAll('.player-card__crown')).toHaveLength(0);
    });

    test('crown appears only on the correct player', () => {
        render(<PlayerList players={players} gameMasterId="p2" />);
        const items = screen.getAllByRole('listitem');
        // Bob is p2; find which item contains the crown svg
        const bobItem = items.find(li => li.textContent?.includes('Bob'));
        const aliceItem = items.find(li => li.textContent?.includes('Alice'));
        expect(bobItem?.querySelector('.player-card__crown')).toBeTruthy();
        expect(aliceItem?.querySelector('.player-card__crown')).toBeFalsy();
    });

    test('preserves original order when sortByScore is false', () => {
        render(<PlayerList players={players} gameMasterId={null} />);
        const items = screen.getAllByRole('listitem');
        expect(items[0].textContent).toContain('Alice');
        expect(items[1].textContent).toContain('Bob');
        expect(items[2].textContent).toContain('Charlie');
    });

    test('sorts players by score descending when sortByScore is true', () => {
        render(<PlayerList players={players} gameMasterId={null} sortByScore />);
        const items = screen.getAllByRole('listitem');
        // Alice 100 > Charlie 75 > Bob 50
        expect(items[0].textContent).toContain('Alice');
        expect(items[1].textContent).toContain('Charlie');
        expect(items[2].textContent).toContain('Bob');
    });

    test('does not mutate the original players array when sorting', () => {
        const original = [...players];
        render(<PlayerList players={players} gameMasterId={null} sortByScore />);
        expect(players[0].username).toBe(original[0].username);
        expect(players[1].username).toBe(original[1].username);
        expect(players[2].username).toBe(original[2].username);
    });
});
