import { useNavigate } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { getSocket } from '../hooks/useSocket';
import SessionCard from '../components/SessionCard';
import { IconArrowBack, IconSportsEsports } from '../components/Icons';
import type { PlayerData } from '../types/game';
import './LobbyListPage.css';

export default function LobbyListPage() {
    const navigate = useNavigate();
    const { lobbySessions } = useGameState(undefined);

    function handleJoin(sessionId: string) {
        const username = sessionStorage.getItem('pendingUsername');
        if (!username) {
            navigate('/');
            return;
        }
        const socket = getSocket();
        socket.emit('join-session', { username, sessionId });
        socket.once('session-joined', ({ sessionId: sid, playerId }: { sessionId: string; playerId: string; player: PlayerData }) => {
            sessionStorage.setItem('sessionId', sid);
            sessionStorage.setItem('playerId', playerId);
            navigate(`/lobby/${sid}`);
        });
        socket.once('game-error', ({ message }: { message: string }) => {
            alert(message);
        });
    }

    return (
        <div className="lobby-list-page page-fade-in">
            <div className="lobby-list-page__header">
                <button className="lobby-list-page__back" onClick={() => navigate('/')} aria-label="Back to home">
                    <IconArrowBack size={20} />
                    Back
                </button>
                <h1 className="lobby-list-page__title">Open Sessions</h1>
                <p className="lobby-list-page__subtitle">Join a game that's waiting to start</p>
            </div>

            <div className="lobby-list-page__list">
                {lobbySessions.length === 0 ? (
                    <div className="lobby-list-page__empty">
                        <IconSportsEsports size={48} className="lobby-list-page__empty-icon" />
                        <p>No open sessions right now.</p>
                        <p className="lobby-list-page__empty-hint">Go back and create one!</p>
                    </div>
                ) : (
                    lobbySessions.map((s, i) => (
                        <SessionCard
                            key={s.id}
                            session={{
                                id: s.id,
                                playerCount: s.players.length,
                                gameMasterId: s.gameMasterId ?? '',
                                players: s.players,
                            }}
                            onJoin={() => handleJoin(s.id)}
                            index={i}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
