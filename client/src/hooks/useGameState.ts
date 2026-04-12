import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import type { SessionState, ChatMessage, GameEndedPayload, GuessResult } from '../types/game';

export function useGameState(_sessionId: string | undefined) {
  const socket = useSocket();
  const [session, setSession] = useState<SessionState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [lastGuessResult, setLastGuessResult] = useState<GuessResult | null>(null);
  const [gameEnded, setGameEnded] = useState<GameEndedPayload | null>(null);
  const [lobbySessions, setLobbySessions] = useState<SessionState[]>([]);

  const addMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    setMessages(prev => [...prev, {
      ...msg,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    }]);
  }, []);

  useEffect(() => {
    socket.on('session-updated', (data: SessionState) => {
      setSession(data);
    });

    socket.on('reconnected', (data: SessionState) => {
      setSession(data);
      addMessage({ type: 'system', text: 'Reconnected to session.' });
    });

    socket.on('game-started', (data: SessionState) => {
      setSession(data);
      setTimeLeft(60);
      setGameEnded(null);
      addMessage({ type: 'system', text: 'Game started! Make your guesses.' });
    });

    socket.on('timer-tick', ({ timeLeft }: { timeLeft: number }) => {
      setTimeLeft(timeLeft);
    });

    socket.on('guess-result', (result: GuessResult) => {
      setLastGuessResult(result);
      if (result.result === 'wrong') {
        addMessage({
          type: 'wrong',
          text: `Wrong answer. ${result.attemptsLeft} attempt${result.attemptsLeft === 1 ? '' : 's'} left.`,
        });
      } else if (result.result === 'no-attempts') {
        addMessage({ type: 'wrong', text: 'No attempts remaining.' });
      }
    });

    socket.on('game-ended', (payload: GameEndedPayload) => {
      setGameEnded(payload);
      if (payload.winnerId) {
        addMessage({ type: 'correct', text: `${payload.winnerName} got it right! Answer: "${payload.answer}"` });
      } else {
        addMessage({ type: 'system', text: `Time's up! The answer was "${payload.answer}".` });
      }
    });

    socket.on('game-error', ({ message }: { message: string }) => {
      addMessage({ type: 'system', text: `Error: ${message}` });
    });

    socket.on('lobby-updated', (sessions: SessionState[]) => {
      setLobbySessions(sessions);
    });

    socket.on('player-guessed', ({ username, result }: { username: string; result: 'correct' | 'wrong' }) => {
      addMessage({
        type: result === 'correct' ? 'correct' : 'guess',
        username,
        text: result === 'correct' ? `${username} got it right!` : `${username} made a guess...`,
      });
    });

    return () => {
      socket.off('session-updated');
      socket.off('reconnected');
      socket.off('game-started');
      socket.off('timer-tick');
      socket.off('guess-result');
      socket.off('game-ended');
      socket.off('game-error');
      socket.off('lobby-updated');
      socket.off('player-guessed');
    };
  }, [socket, addMessage]);

  const myPlayerId = sessionStorage.getItem('playerId');
  const myPlayer = session?.players.find(p => p.id === myPlayerId) ?? null;
  const isGameMaster = myPlayer?.isGameMaster ?? false;

  return { session, messages, timeLeft, lastGuessResult, gameEnded, addMessage, myPlayerId, myPlayer, isGameMaster, lobbySessions };
}
