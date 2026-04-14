import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket, resetSocket } from '../hooks/useSocket';
import type { PlayerData, SessionState } from '../types/game';
import { IconPersonRaisedHand } from '../components/Icons';
import Footer from '../components/Footer';
import './HomePage.css';

export default function HomePage() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const existingSession = sessionStorage.getItem('sessionId');
        const existingPlayer = sessionStorage.getItem('playerId');
        if (!existingSession || !existingPlayer) return;

        const socket = getSocket();
        const timeout = setTimeout(() => {
            sessionStorage.removeItem('sessionId');
            sessionStorage.removeItem('playerId');
            resetSocket();
        }, 1500);

        socket.once('reconnected', (data: SessionState) => {
            clearTimeout(timeout);
            if (data.status === 'in-progress') {
                navigate(`/game/${data.id}`, { replace: true });
            } else {
                navigate(`/lobby/${data.id}`, { replace: true });
            }
        });

        return () => {
            clearTimeout(timeout);
            socket.off('reconnected');
        };
    }, [navigate]);

    function validateUsername(): boolean {
        if (username.trim().length < 2) {
            setError('Username must be at least 2 characters.');
            return false;
        }
        if (username.trim().length > 20) {
            setError('Username must be 20 characters or less.');
            return false;
        }
        setError('');
        return true;
    }

    function handleCreateGame() {
        if (!validateUsername()) return;
        sessionStorage.removeItem('sessionId');
        sessionStorage.removeItem('playerId');
        resetSocket();
        const socket = getSocket();

        socket.emit('create-session', { username: username.trim() });
        socket.once('session-created', ({ sessionId, playerId }: { sessionId: string; playerId: string; player: PlayerData }) => {
            sessionStorage.setItem('sessionId', sessionId);
            sessionStorage.setItem('playerId', playerId);
            navigate(`/lobby/${sessionId}`);
        });
        socket.once('game-error', ({ message }: { message: string }) => {
            setError(message);
        });
    }

    function handleBrowse() {
        if (!validateUsername()) return;
        sessionStorage.setItem('pendingUsername', username.trim());
        navigate('/sessions');
    }

    return (
        <div className="home-page page-fade-in">
            <div className="home-card">
                <div className="home-card__logo">
                    <IconPersonRaisedHand size={64} className="home-card__logo-icon" />
                    <h1 className="home-card__title">Guessing Game</h1>
                    <p className="home-card__subtitle">Real-time guessing game for you and your friends</p>
                </div>

                <div className="home-card__form">
                    <label className="home-card__label" htmlFor="username-input">
                        Your name
                    </label>
                    <input
                        id="username-input"
                        className={`home-card__input ${error ? 'home-card__input--error' : ''}`}
                        type="text"
                        placeholder="Enter username (2-20 characters)"
                        value={username}
                        onChange={e => { setUsername(e.target.value); setError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleCreateGame()}
                        maxLength={20}
                        autoFocus
                    />
                    {error && <p className="home-card__error">{error}</p>}
                </div>

                <div className="home-card__actions">
                    <button className="btn btn--primary" onClick={handleCreateGame}>
                        Create Game
                    </button>
                    <button className="btn btn--outline" onClick={handleBrowse}>
                        Browse Sessions
                    </button>
                </div>

                <p className="home-card__hint">Have a session link? It will join you automatically.</p>
            </div>
            <Footer />
        </div>
    );
}
