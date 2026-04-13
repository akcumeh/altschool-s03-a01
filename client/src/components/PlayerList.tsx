import type { PlayerData } from '../types/game';
import { IconWorkspacePremium } from './Icons';
import './PlayerList.css';

const PLAYER_COLORS = [
    'var(--player-1)',
    'var(--player-2)',
    'var(--player-3)',
    'var(--player-4)',
    'var(--player-5)',
    'var(--player-6)',
];

interface Props {
    players: PlayerData[];
    gameMasterId: string | null;
    sortByScore?: boolean;
}

export default function PlayerList({ players, gameMasterId, sortByScore = false }: Props) {
    const sorted = sortByScore
        ? [...players].sort((a, b) => b.score - a.score)
        : players;

    return (
        <div className="player-list">
            <h3 className="player-list__title">
                Players <span className="player-list__count">{players.length}</span>
            </h3>
            <ul className="player-list__items">
                {sorted.map((player, idx) => (
                    <li key={player.id} className="player-card">
                        <div
                            className="player-card__avatar"
                            style={{ background: PLAYER_COLORS[idx % PLAYER_COLORS.length] }}
                        >
                            {player.username[0].toUpperCase()}
                        </div>
                        <div className="player-card__info">
                            <span className="player-card__name">
                                {player.username}
                                {player.id === gameMasterId && (
                                    <IconWorkspacePremium
                                        size={16}
                                        className="player-card__crown"
                                    />
                                )}
                            </span>
                            <span className="player-card__score">{player.score} pts</span>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
