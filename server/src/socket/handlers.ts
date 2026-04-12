import { Server, Socket } from 'socket.io';
import Joi from 'joi';
import { sessionManager } from '../classes/SessionManager';
import { Player } from '../classes/Player';
import { supabase } from '../db/supabase';

const joinSchema = Joi.object({
    username: Joi.string().min(2).max(20).required(),
    sessionId: Joi.string().uuid().optional(),
    playerId: Joi.string().uuid().optional(),
});

const questionSchema = Joi.object({
    sessionId: Joi.string().uuid().required(),
    question: Joi.string().min(1).max(200).required(),
    answer: Joi.string().min(1).max(100).required(),
    playerId: Joi.string().uuid().required(),
});

const guessSchema = Joi.object({
    sessionId: Joi.string().uuid().required(),
    guess: Joi.string().min(1).max(100).required(),
});

function broadcastLobby(io: Server) {
    const waiting = sessionManager.getAll()
        .filter(s => s.status === 'waiting')
        .map(s => s.getPublicState());
    io.to('lobby').emit('lobby-updated', waiting);
}

export function registerSocketHandlers(io: Server) {
    io.on('connection', (socket: Socket) => {
        socket.join('lobby');
        const waiting = sessionManager.getAll()
            .filter(s => s.status === 'waiting')
            .map(s => s.getPublicState());
        socket.emit('lobby-updated', waiting);

        const { playerId, sessionId } = socket.handshake.auth as {
            playerId?: string;
            sessionId?: string;
        };

        if (playerId && sessionId) {
            const session = sessionManager.get(sessionId);
            const player = session?.players.get(playerId);
            if (player && session) {
                player.socketId = socket.id;
                socket.join(sessionId);
                socket.emit('reconnected', session.getPublicState());
                return;
            }
        }

        // create a new session (become game master)
        socket.on('create-session', (data: { username: string }) => {
            const { error } = Joi.object({ username: Joi.string().min(2).max(20).required() }).validate(data);
            if (error) return socket.emit('game-error', { message: error.message });

            const session = sessionManager.create();
            const player = new Player(data.username, socket.id);
            session.addPlayer(player);
            socket.join(session.id);

            session.onEnd = async (s, winnerId) => {
                const winner = winnerId ? s.players.get(winnerId) : null;
                io.to(s.id).emit('game-ended', {
                    winnerId,
                    winnerName: winner?.username ?? null,
                    answer: s.getAnswer(),
                    players: Array.from(s.players.values()).map(p => p.toJSON()),
                });

                await supabase.from('sessions').upsert({
                    id: s.id,
                    status: 'ended',
                    winner_id: winnerId,
                });
            };

            socket.emit('session-created', { sessionId: session.id, playerId: player.id, player: player.toJSON() });
            io.to(session.id).emit('session-updated', session.getPublicState());
            broadcastLobby(io);
        });

        // join existing session
        socket.on('join-session', (data: { username: string; sessionId: string }) => {
            const { error } = joinSchema.validate(data);
            if (error) return socket.emit('game-error', { message: error.message });

            const session = sessionManager.get(data.sessionId);
            if (!session) return socket.emit('game-error', { message: 'Session not found' });
            if (session.status === 'in-progress') return socket.emit('game-error', { message: 'Game already in progress' });

            const player = new Player(data.username, socket.id);
            session.addPlayer(player);
            socket.join(session.id);

            socket.emit('session-joined', { sessionId: session.id, playerId: player.id, player: player.toJSON() });
            io.to(session.id).emit('session-updated', session.getPublicState());
            broadcastLobby(io);
        });

        // game master sets the question
        socket.on('set-question', (data: { sessionId: string; question: string; answer: string; playerId: string }) => {
            const { error } = questionSchema.validate(data);
            if (error) return socket.emit('game-error', { message: error.message });

            const session = sessionManager.get(data.sessionId);
            if (!session) return socket.emit('game-error', { message: 'Session not found' });

            const ok = session.setQuestion(data.question, data.answer, data.playerId);
            if (!ok) return socket.emit('game-error', { message: 'Only the game master can set a question' });

            socket.emit('question-set', { success: true });
        });

        // game master starts the game
        socket.on('start-game', (data: { sessionId: string; playerId: string }) => {
            const session = sessionManager.get(data.sessionId);
            if (!session) return socket.emit('game-error', { message: 'Session not found' });

            const ok = session.start(data.playerId);
            if (!ok) return socket.emit('game-error', { message: 'Cannot start: need 3+ players, a question, and you must be game master' });

            io.to(session.id).emit('game-started', session.getPublicState());

            let timeLeft = 60;
            const tick = setInterval(() => {
                timeLeft--;
                io.to(session.id).emit('timer-tick', { timeLeft });
                if (timeLeft <= 0) clearInterval(tick);
            }, 1000);
        });

        // player submits a guess
        socket.on('guess', (data: { sessionId: string; playerId: string; guess: string }) => {
            const { error } = guessSchema.validate(data);
            if (error) return socket.emit('game-error', { message: error.message });

            const session = sessionManager.get(data.sessionId);
            if (!session) return socket.emit('game-error', { message: 'Session not found' });

            const result = session.guess(data.playerId, data.guess);

            if (result === 'correct') {
                socket.emit('guess-result', { result: 'correct', message: 'You have won!' });
                io.to(session.id).emit('player-guessed', {
                    username: Array.from(session.players.values()).find(p => p.id === data.playerId)?.username,
                    result: 'correct',
                });
            } else if (result === 'wrong') {
                const remaining = session.getRemainingAttempts(data.playerId);
                socket.emit('guess-result', { result: 'wrong', attemptsLeft: remaining });
                io.to(session.id).emit('player-guessed', {
                    username: Array.from(session.players.values()).find(p => p.id === data.playerId)?.username,
                    result: 'wrong',
                });
            } else if (result === 'no-attempts') {
                socket.emit('guess-result', { result: 'no-attempts', message: 'No attempts remaining' });
            } else {
                socket.emit('game-error', { message: 'You cannot guess right now' });
            }
        });

        // player leaves
        socket.on('disconnect', () => {
            sessionManager.getAll().forEach(session => {
                const player = Array.from(session.players.values()).find(p => p.socketId === socket.id);
                if (!player) return;

                session.removePlayer(player.id);
                io.to(session.id).emit('session-updated', session.getPublicState());

                if (session.players.size === 0) {
                    sessionManager.delete(session.id);
                }
                broadcastLobby(io);
            });
        });
    });
}
