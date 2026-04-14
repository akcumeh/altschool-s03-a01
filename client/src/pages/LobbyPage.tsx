import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { getSocket, resetSocket } from '../hooks/useSocket';
import ChatFeed from '../components/ChatFeed';
import PlayerList from '../components/PlayerList';
import { IconPersonRaisedHand, IconHourglassEmpty, IconShare, IconCheck } from '../components/Icons';
import type { PlayerData } from '../types/game';
import './LobbyPage.css';

export default function LobbyPage() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();

    const [joinUsername, setJoinUsername] = useState('');
    const [joinError, setJoinError] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const needsJoin = !sessionStorage.getItem('playerId') || !sessionStorage.getItem('sessionId');

    const { session, messages, addMessage, isGameMaster } = useGameState(needsJoin ? undefined : sessionId);
    const socket = getSocket();

    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [duration, setDuration] = useState(60);
    const [startError, setStartError] = useState('');
    const [copied, setCopied] = useState(false);
    const prevPlayerCount = useRef<number>(0);

    useEffect(() => {
        if (!sessionId || needsJoin) return;
        socket.emit('get-session', { sessionId });
    }, [sessionId, socket, needsJoin]);

    useEffect(() => {
        if (!session || needsJoin) return;
        const count = session.players.length;
        if (prevPlayerCount.current !== 0 && count !== prevPlayerCount.current) {
            if (count > prevPlayerCount.current) {
                const newest = session.players[session.players.length - 1];
                addMessage({ type: 'system', text: `${newest.username} joined the lobby.` });
            } else {
                addMessage({ type: 'system', text: 'A player left the lobby.' });
            }
        }
        prevPlayerCount.current = count;
    }, [session?.players.length, session, addMessage, needsJoin]);

    useEffect(() => {
        if (needsJoin) return;
        socket.on('game-started', () => {
            navigate(`/game/${sessionId}`);
        });
        return () => { socket.off('game-started'); };
    }, [socket, sessionId, navigate, needsJoin]);

    function handleJoinViaLink() {
        setJoinError('');
        const name = joinUsername.trim();
        if (name.length < 2 || name.length > 20) {
            setJoinError('Username must be 2-20 characters.');
            return;
        }
        setIsJoining(true);
        resetSocket();
        const s = getSocket();
        s.emit('join-session', { username: name, sessionId });
        s.once('session-joined', ({ sessionId: sid, playerId }: { sessionId: string; playerId: string; player: PlayerData }) => {
            sessionStorage.setItem('sessionId', sid);
            sessionStorage.setItem('playerId', playerId);
            navigate(`/lobby/${sid}`, { replace: true });
        });
        s.once('game-error', ({ message }: { message: string }) => {
            setJoinError(message);
            setIsJoining(false);
        });
    }

    function handleStartGame() {
        setStartError('');
        if (!question.trim() || !answer.trim()) {
            setStartError('Please enter both a question and an answer.');
            return;
        }
        const playerId = sessionStorage.getItem('playerId')!;
        socket.emit('set-question', { sessionId, question: question.trim(), answer: answer.trim(), playerId, duration });
        socket.once('question-set', () => {
            socket.emit('start-game', { sessionId, playerId });
        });
        socket.once('game-error', ({ message }: { message: string }) => {
            setStartError(message);
        });
    }

    function copyShareLink() {
        const url = `${window.location.origin}/lobby/${sessionId}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    const canStart = (session?.players.length ?? 0) >= 3;

    if (needsJoin) {
        return (
            <div className="lobby-page page-fade-in">
                <div className="lobby-page__join-form">
                    <IconPersonRaisedHand size={52} className="lobby-page__join-icon" />
                    <h2 className="lobby-page__join-title">Join this session</h2>
                    <p className="lobby-page__join-sub">Enter your name to join the game</p>
                    <input
                        className="lobby-page__input"
                        type="text"
                        placeholder="Your username (2-20 characters)"
                        value={joinUsername}
                        onChange={e => { setJoinUsername(e.target.value); setJoinError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleJoinViaLink()}
                        maxLength={20}
                        autoFocus
                    />
                    {joinError && <p className="lobby-page__error">{joinError}</p>}
                    <button
                        className="btn btn--primary"
                        onClick={handleJoinViaLink}
                        disabled={isJoining}
                    >
                        {isJoining ? 'Joining...' : 'Join Game'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="lobby-page page-fade-in">
            <header className="lobby-page__header">
                <div className="lobby-page__session-info">
                    <span className="lobby-page__session-label">Session ID</span>
                    <code className="lobby-page__session-id">{sessionId?.slice(0, 8)}...</code>
                </div>
                <button
                    className="lobby-page__copy-btn"
                    onClick={copyShareLink}
                    aria-label="Copy shareable link"
                >
                    {copied ? <IconCheck size={16} /> : <IconShare size={16} />}
                    {copied ? 'Copied!' : 'Share Link'}
                </button>
            </header>

            <div className="lobby-page__body">
                <main className="lobby-page__main">
                    <ChatFeed messages={messages} />

                    {isGameMaster ? (
                        <div className="lobby-page__gm-controls">
                            <h3 className="lobby-page__gm-title">Set the Question</h3>
                            <input
                                className="lobby-page__input"
                                type="text"
                                placeholder="Question (e.g. What is the capital of France?)"
                                value={question}
                                onChange={e => setQuestion(e.target.value)}
                                maxLength={200}
                            />
                            <input
                                className="lobby-page__input"
                                type="text"
                                placeholder="Answer (hidden from players)"
                                value={answer}
                                onChange={e => setAnswer(e.target.value)}
                                maxLength={100}
                            />
                            <input
                                className="lobby-page__input"
                                type="number"
                                min={30}
                                max={120}
                                value={duration}
                                onChange={e => setDuration(Number(e.target.value))}
                                placeholder="Round timer in seconds (30-120, default 60)"
                            />
                            {startError && <p className="lobby-page__error">{startError}</p>}
                            {!canStart && (
                                <p className="lobby-page__hint">
                                    Need at least 3 players to start ({session?.players.length ?? 0}/3)
                                </p>
                            )}
                            <button
                                className="btn btn--primary lobby-page__start-btn"
                                onClick={handleStartGame}
                                disabled={!canStart}
                            >
                                Start Game
                            </button>
                        </div>
                    ) : (
                        <div className="lobby-page__waiting">
                            <IconHourglassEmpty size={24} className="lobby-page__waiting-icon" />
                            <p>Waiting for the game master to start the game...</p>
                        </div>
                    )}
                </main>

                <aside className="lobby-page__sidebar">
                    {session && (
                        <PlayerList players={session.players} gameMasterId={session.gameMasterId} />
                    )}
                </aside>
            </div>
        </div>
    );
}
