import { useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import type { GameEndedPayload, PlayerData } from '../types/game';
import './ResultsPage.css';

const PODIUM_MEDALS = ['🥇', '🥈', '🥉'];

export default function ResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { session, isGameMaster, gameEnded: liveEnded } = useGameState(sessionId);

  // gameEnded payload: from router state (set by GamePage) or from live hook
  const gameEnded: GameEndedPayload | null = location.state?.gameEnded ?? liveEnded;

  // If all players leave, redirect home
  useEffect(() => {
    if (session && session.players.length === 0) {
      navigate('/', { replace: true });
    }
  }, [session, navigate]);

  const sortedPlayers: PlayerData[] = gameEnded
    ? [...gameEnded.players].sort((a, b) => b.score - a.score)
    : [];

  function handleNextRound() {
    navigate(`/lobby/${sessionId}`);
  }

  return (
    <div className="results-page page-fade-in">
      {/* Winner / No-winner announcement */}
      <div className={`results-page__announcement ${gameEnded?.winnerId ? 'results-page__announcement--win' : 'results-page__announcement--timeout'}`}>
        {gameEnded?.winnerId ? (
          <>
            <span className="results-page__trophy">🏆</span>
            <h1 className="results-page__winner-name">{gameEnded.winnerName} wins!</h1>
            <p className="results-page__answer">Answer: <strong>{gameEnded.answer}</strong></p>
          </>
        ) : (
          <>
            <span className="results-page__trophy">⏰</span>
            <h1 className="results-page__no-winner">Time's up — no winner!</h1>
            {gameEnded && (
              <p className="results-page__answer">The answer was: <strong>{gameEnded.answer}</strong></p>
            )}
          </>
        )}
      </div>

      {/* Scoreboard */}
      <div className="results-page__scoreboard">
        <h2 className="results-page__scoreboard-title">Scoreboard</h2>
        <ol className="results-page__scores">
          {sortedPlayers.map((player, idx) => (
            <li
              key={player.id}
              className={`results-score-row ${idx < 3 ? `results-score-row--top${idx + 1}` : ''}`}
            >
              <span className="results-score-row__rank">
                {idx < 3 ? PODIUM_MEDALS[idx] : `#${idx + 1}`}
              </span>
              <span className="results-score-row__name">{player.username}</span>
              <span className="results-score-row__pts">{player.score} pts</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Navigation */}
      <div className="results-page__actions">
        {isGameMaster ? (
          <button className="btn btn--primary" onClick={handleNextRound}>
            Start Next Round →
          </button>
        ) : (
          session?.status === 'waiting' ? (
            <button className="btn btn--outline" onClick={() => navigate(`/lobby/${sessionId}`)}>
              Back to Lobby
            </button>
          ) : (
            <p className="results-page__waiting">Waiting for the new game master to start the next round…</p>
          )
        )}
      </div>
    </div>
  );
}
