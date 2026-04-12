import type { PlayerData } from '../types/game';
import './SessionCard.css';

const BORDER_COLORS = [
  'var(--player-1)',
  'var(--player-2)',
  'var(--player-3)',
  'var(--player-4)',
  'var(--player-5)',
  'var(--player-6)',
];

interface SessionCardSession {
  id: string;
  playerCount: number;
  gameMasterId: string;
  players: PlayerData[];
}

interface Props {
  session: SessionCardSession;
  onJoin: () => void;
  index?: number;
}

export default function SessionCard({ session, onJoin, index = 0 }: Props) {
  const gm = session.players.find(p => p.id === session.gameMasterId);
  const borderColor = BORDER_COLORS[index % BORDER_COLORS.length];

  return (
    <div className="session-card" style={{ borderLeftColor: borderColor }}>
      <div className="session-card__info">
        <p className="session-card__host">
          <span className="session-card__crown">♛</span>
          {gm?.username ?? 'Unknown'}
        </p>
        <p className="session-card__players">
          {session.playerCount} player{session.playerCount !== 1 ? 's' : ''} waiting
        </p>
      </div>
      <button className="session-card__btn" onClick={onJoin}>
        Join
      </button>
    </div>
  );
}
