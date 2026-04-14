import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { getSocket } from '../hooks/useSocket';
import ChatFeed from '../components/ChatFeed';
import PlayerList from '../components/PlayerList';
import Timer from '../components/Timer';
import QuestionCard from '../components/QuestionCard';
import GuessInput from '../components/GuessInput';
import { IconWorkspacePremium } from '../components/Icons';
import './GamePage.css';

export default function GamePage() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const { session, messages, timeLeft, lastGuessResult, gameEnded, isGameMaster, myPlayerId, countdown } = useGameState(sessionId);
    const socket = getSocket();

    useEffect(() => {
        if (!sessionStorage.getItem('playerId')) {
            navigate('/', { replace: true });
        }
    }, [navigate]);

    useEffect(() => {
        if (!sessionId) return;
        socket.emit('get-session', { sessionId });
    }, [sessionId, socket]);

    useEffect(() => {
        if (!gameEnded) return;
        const t = setTimeout(() => {
            navigate(`/lobby/${sessionId}`, { replace: true });
        }, 5000);
        return () => clearTimeout(t);
    }, [gameEnded, sessionId, navigate]);

    function handleGuess(guess: string) {
        const playerId = sessionStorage.getItem('playerId')!;
        socket.emit('guess', { sessionId, playerId, guess });
    }

    const myPlayer = session?.players.find(p => p.id === myPlayerId) ?? null;
    const attemptsLeft = lastGuessResult?.result === 'wrong'
        ? (lastGuessResult.attemptsLeft ?? 3)
        : lastGuessResult?.result === 'no-attempts'
            ? 0
            : 3;

    const guessDisabled =
        !session?.question ||
        countdown !== null ||
        isGameMaster ||
        attemptsLeft <= 0 ||
        lastGuessResult?.result === 'correct' ||
        lastGuessResult?.result === 'no-attempts' ||
        !!gameEnded;

    return (
        <div className="game-page page-fade-in">
            {countdown !== null && (
                <div className="game-page__countdown-overlay">
                    <span className="game-page__countdown-number">{countdown}</span>
                </div>
            )}
            <header className="game-page__timer-bar">
                <Timer timeLeft={timeLeft} total={session?.timerDuration ?? 60} />
            </header>

            <div className="game-page__body">
                <main className="game-page__main">
                    {session?.question ? (
                        <QuestionCard question={session.question} />
                    ) : (
                        <div className="game-page__loading">Loading question...</div>
                    )}

                    <ChatFeed messages={messages} />

                    {isGameMaster ? (
                        <div className="game-page__gm-note">
                            <IconWorkspacePremium size={20} />
                            You set this question. Watch your players!
                        </div>
                    ) : (
                        <GuessInput
                            onSubmit={handleGuess}
                            disabled={guessDisabled}
                            attemptsLeft={attemptsLeft}
                        />
                    )}
                </main>

                <aside className="game-page__sidebar">
                    {session && (
                        <PlayerList
                            players={session.players}
                            gameMasterId={session.gameMasterId}
                            sortByScore
                        />
                    )}
                    {myPlayer && !isGameMaster && (
                        <div className="game-page__my-score">
                            Your score: <strong>{myPlayer.score}</strong>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}
