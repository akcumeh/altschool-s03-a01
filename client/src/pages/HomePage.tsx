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
    const [rulesOpen, setRulesOpen] = useState(false);

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
            {rulesOpen && (
                <div className="rules-overlay" onClick={() => setRulesOpen(false)}>
                    <div className="rules-modal" onClick={e => e.stopPropagation()}>
                        <div className="rules-modal__header">
                            <h2 className="rules-modal__title">How to Play</h2>
                            <button className="rules-modal__close" onClick={() => setRulesOpen(false)} aria-label="Close">&#x2715;</button>
                        </div>
                        <ol className="rules-modal__list">
                            <li>You need at least <strong>3 players</strong> to start a game.</li>
                            <li>Enter your username on the home page, then <strong>Create a Game</strong> or <strong>Browse Sessions</strong> to join an open one.</li>
                            <li>The player who creates a game becomes the <strong>Game Master</strong>. Share your session link so friends can join; they will need to pick a username.</li>
                            <li>The Game Master sets a <strong>question</strong> and a secret <strong>answer</strong>. They do not guess that round. The default round time is <strong>60 seconds</strong>, but the Game Master can set it anywhere from 30 to 120 seconds.</li>
                            <li>Each guesser gets <strong>3 attempts</strong>. The first person to guess correctly wins <strong>10 points</strong>. If time runs out, no points are awarded.</li>
                            <li>After each round, the Game Master role passes to the next player (in join order), who must set the next question.</li>
                        </ol>
                    </div>
                </div>
            )}
            <div className="home-page__center">
            <div className="home-card">
                <div className="home-card__logo">
                    <IconPersonRaisedHand size={64} className="home-card__logo-icon" />
                    <h1 className="home-card__title">Guessing Game</h1>
                    <p className="home-card__subtitle">Real-time guessing game for you and your friends</p>
                    <button className="home-card__rules-link" onClick={() => setRulesOpen(true)}>How to Play</button>
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
            </div>
            <Footer />
        </div>
    );
}
