jest.mock('../db/supabase', () => ({
    supabase: {
        from: () => ({
            upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
    },
}));

import { createServer } from 'http';
import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { io as Client } from 'socket.io-client';
import type { Socket as ClientSocket } from 'socket.io-client';
import { registerSocketHandlers } from '../socket/handlers';
import { sessionManager } from '../classes/SessionManager';
import { GameSession } from '../classes/GameSession';
import { Player } from '../classes/Player';

let httpServer: HttpServer;
let ioServer: Server;
let port: number;
const clients: ClientSocket[] = [];

function newClient(): ClientSocket {
    const socket = Client(`http://localhost:${port}`, {
        autoConnect: true,
        reconnection: false,
    });
    clients.push(socket);
    return socket;
}

function waitFor<T = Record<string, unknown>>(
    socket: ClientSocket,
    event: string,
    timeout = 3000,
): Promise<T> {
    return new Promise((resolve, reject) => {
        const t = setTimeout(
            () => reject(new Error(`Timeout waiting for "${event}"`)),
            timeout,
        );
        socket.once(event, (data: T) => {
            clearTimeout(t);
            resolve(data);
        });
    });
}

function waitForConnect(socket: ClientSocket): Promise<void> {
    if (socket.connected) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('Connection timeout')), 3000);
        socket.once('connect', () => { clearTimeout(t); resolve(); });
        socket.once('connect_error', (err: Error) => { clearTimeout(t); reject(err); });
    });
}

function clearAllSessions() {
    sessionManager.getAll().forEach(s => sessionManager.delete(s.id));
}

async function createSession(username: string): Promise<{ socket: ClientSocket; sessionId: string; playerId: string }> {
    const socket = newClient();
    await waitForConnect(socket);
    socket.emit('create-session', { username });
    const data = await waitFor<{ sessionId: string; playerId: string }>(socket, 'session-created');
    return { socket, ...data };
}

async function joinSession(username: string, sessionId: string): Promise<{ socket: ClientSocket; playerId: string }> {
    const socket = newClient();
    await waitForConnect(socket);
    socket.emit('join-session', { username, sessionId });
    const data = await waitFor<{ sessionId: string; playerId: string }>(socket, 'session-joined');
    return { socket, playerId: data.playerId };
}

beforeAll((done) => {
    httpServer = createServer();
    ioServer = new Server(httpServer, { cors: { origin: '*' } });
    registerSocketHandlers(ioServer);
    httpServer.listen(0, () => {
        port = (httpServer.address() as { port: number }).port;
        done();
    });
});

afterAll((done) => {
    clients.splice(0).forEach(c => c.disconnect());
    ioServer.close(done);
});

afterEach(() => {
    clearAllSessions();
    clients.splice(0).forEach(c => c.disconnect());
    jest.useRealTimers();
});

// =============================================================================
// SESSION CREATION
// =============================================================================

describe('SESSION CREATION', () => {
    it('create-session with valid username emits session-created with sessionId and playerId', async () => {
        const { sessionId, playerId } = await createSession('Alice');
        expect(typeof sessionId).toBe('string');
        expect(typeof playerId).toBe('string');
    });

    it('create-session with username shorter than 2 chars emits game-error', async () => {
        const socket = newClient();
        await waitForConnect(socket);
        socket.emit('create-session', { username: 'A' });
        const err = await waitFor<{ message: string }>(socket, 'game-error');
        expect(err.message).toBeDefined();
    });

    it('create-session with username longer than 20 chars emits game-error', async () => {
        const socket = newClient();
        await waitForConnect(socket);
        socket.emit('create-session', { username: 'A'.repeat(21) });
        const err = await waitFor<{ message: string }>(socket, 'game-error');
        expect(err.message).toBeDefined();
    });
});

// =============================================================================
// JOINING
// =============================================================================

describe('JOINING', () => {
    it('join-session with valid data emits session-joined', async () => {
        const { sessionId } = await createSession('Alice');
        const { playerId } = await joinSession('Bob', sessionId);
        expect(typeof playerId).toBe('string');
    });

    it('join-session on non-existent sessionId emits game-error with "Session not found"', async () => {
        const socket = newClient();
        await waitForConnect(socket);
        socket.emit('join-session', { username: 'Bob', sessionId: '00000000-0000-0000-0000-000000000000' });
        const err = await waitFor<{ message: string }>(socket, 'game-error');
        expect(err.message).toBe('Session not found');
    });

    it('join-session while session is in-progress emits game-error with "Game already in progress"', async () => {
        const { socket: gm, sessionId, playerId: gmId } = await createSession('Alice');
        const { socket: p2 } = await joinSession('Bob', sessionId);
        const { socket: p3 } = await joinSession('Carol', sessionId);
        gm.emit('set-question', { sessionId, playerId: gmId, question: 'Q?', answer: 'ans', duration: 30 });
        await waitFor(gm, 'question-set');
        gm.emit('start-game', { sessionId, playerId: gmId });
        await Promise.all([
            waitFor(gm, 'game-started'),
            waitFor(p2, 'game-started'),
            waitFor(p3, 'game-started'),
        ]);

        const late = newClient();
        await waitForConnect(late);
        late.emit('join-session', { username: 'Dave', sessionId });
        const err = await waitFor<{ message: string }>(late, 'game-error');
        expect(err.message).toBe('Game already in progress');
    });

    it('after a player joins, all clients in session receive session-updated with updated player list', async () => {
        const { socket: gm, sessionId } = await createSession('Alice');
        // Use a retry listener to handle the session-updated from Alice's own join
        const updatePromise = new Promise<{ players: unknown[] }>(resolve => {
            const handler = (data: { players: unknown[] }) => {
                if (data.players.length >= 2) resolve(data);
                else gm.once('session-updated', handler);
            };
            gm.once('session-updated', handler);
        });
        await joinSession('Bob', sessionId);
        const update = await updatePromise;
        expect(update.players.length).toBe(2);
    });
});

// =============================================================================
// PLAYER COUNT VISIBILITY
// =============================================================================

describe('PLAYER COUNT VISIBILITY', () => {
    it('session-updated payload after each join contains correct players array length', async () => {
        const { socket: gm, sessionId } = await createSession('Alice');

        function waitForCount(count: number) {
            return new Promise<{ players: unknown[] }>(resolve => {
                const handler = (data: { players: unknown[] }) => {
                    if (data.players.length === count) resolve(data);
                    else gm.once('session-updated', handler);
                };
                gm.once('session-updated', handler);
            });
        }

        const p2Promise = waitForCount(2);
        await joinSession('Bob', sessionId);
        expect((await p2Promise).players.length).toBe(2);

        const p3Promise = waitForCount(3);
        await joinSession('Carol', sessionId);
        expect((await p3Promise).players.length).toBe(3);
    });
});

// =============================================================================
// SET QUESTION
// =============================================================================

describe('SET QUESTION', () => {
    it('set-question by GM succeeds and emits question-set', async () => {
        const { socket, sessionId, playerId } = await createSession('Alice');
        socket.emit('set-question', { sessionId, playerId, question: 'Q?', answer: 'ans', duration: 60 });
        const result = await waitFor<{ success: boolean }>(socket, 'question-set');
        expect(result.success).toBe(true);
    });

    it('set-question by non-GM emits game-error', async () => {
        const { sessionId } = await createSession('Alice');
        const { socket: p2, playerId: p2Id } = await joinSession('Bob', sessionId);
        p2.emit('set-question', { sessionId, playerId: p2Id, question: 'Q?', answer: 'ans', duration: 60 });
        const err = await waitFor<{ message: string }>(p2, 'game-error');
        expect(err.message).toMatch(/game master/i);
    });
});

// =============================================================================
// STARTING THE GAME
// =============================================================================

describe('STARTING THE GAME', () => {
    it('start-game with fewer than 3 players emits game-error', async () => {
        const { socket, sessionId, playerId } = await createSession('Alice');
        await joinSession('Bob', sessionId);
        socket.emit('set-question', { sessionId, playerId, question: 'Q?', answer: 'ans', duration: 30 });
        await waitFor(socket, 'question-set');
        socket.emit('start-game', { sessionId, playerId });
        const err = await waitFor<{ message: string }>(socket, 'game-error');
        expect(err.message).toBeDefined();
    });

    it('start-game without question set emits game-error', async () => {
        const { socket, sessionId, playerId } = await createSession('Alice');
        await joinSession('Bob', sessionId);
        await joinSession('Carol', sessionId);
        socket.emit('start-game', { sessionId, playerId });
        const err = await waitFor<{ message: string }>(socket, 'game-error');
        expect(err.message).toBeDefined();
    });

    it('start-game by non-GM emits game-error', async () => {
        const { socket: gm, sessionId, playerId: gmId } = await createSession('Alice');
        const { socket: p2, playerId: p2Id } = await joinSession('Bob', sessionId);
        await joinSession('Carol', sessionId);
        gm.emit('set-question', { sessionId, playerId: gmId, question: 'Q?', answer: 'ans', duration: 30 });
        await waitFor(gm, 'question-set');
        p2.emit('start-game', { sessionId, playerId: p2Id });
        const err = await waitFor<{ message: string }>(p2, 'game-error');
        expect(err.message).toBeDefined();
    });

    it('start-game with 3+ players, question set, by GM emits game-started to all clients', async () => {
        const { socket: gm, sessionId, playerId: gmId } = await createSession('Alice');
        const { socket: p2 } = await joinSession('Bob', sessionId);
        const { socket: p3 } = await joinSession('Carol', sessionId);
        gm.emit('set-question', { sessionId, playerId: gmId, question: 'Q?', answer: 'ans', duration: 30 });
        await waitFor(gm, 'question-set');
        gm.emit('start-game', { sessionId, playerId: gmId });
        await Promise.all([
            waitFor(gm, 'game-started'),
            waitFor(p2, 'game-started'),
            waitFor(p3, 'game-started'),
        ]);
    });
});

// =============================================================================
// GUESSING
// =============================================================================

describe('GUESSING', () => {
    async function startedGame() {
        const { socket: gm, sessionId, playerId: gmId } = await createSession('Alice');
        const { socket: p2, playerId: p2Id } = await joinSession('Bob', sessionId);
        const { socket: p3, playerId: p3Id } = await joinSession('Carol', sessionId);
        gm.emit('set-question', { sessionId, playerId: gmId, question: 'Q?', answer: 'correctanswer', duration: 30 });
        await waitFor(gm, 'question-set');
        gm.emit('start-game', { sessionId, playerId: gmId });
        await Promise.all([
            waitFor(gm, 'game-started'),
            waitFor(p2, 'game-started'),
            waitFor(p3, 'game-started'),
        ]);
        return { gm, gmId, p2, p2Id, p3, p3Id, sessionId };
    }

    it('correct guess emits guess-result { result: "correct" } to guesser', async () => {
        const { p2, p2Id, sessionId } = await startedGame();
        p2.emit('guess', { sessionId, playerId: p2Id, guess: 'correctanswer' });
        const result = await waitFor<{ result: string }>(p2, 'guess-result');
        expect(result.result).toBe('correct');
    });

    it('correct guess emits player-guessed { result: "correct" } to all other players', async () => {
        const { p2, p2Id, gm, sessionId } = await startedGame();
        const guessedPromise = waitFor<{ result: string }>(gm, 'player-guessed');
        p2.emit('guess', { sessionId, playerId: p2Id, guess: 'correctanswer' });
        const guessed = await guessedPromise;
        expect(guessed.result).toBe('correct');
    });

    it('correct guess emits game-ended with winnerId, winnerName, answer, and players', async () => {
        const { p2, p2Id, sessionId } = await startedGame();
        p2.emit('guess', { sessionId, playerId: p2Id, guess: 'correctanswer' });
        const ended = await waitFor<{
            winnerId: string;
            winnerName: string;
            answer: string;
            players: unknown[];
        }>(p2, 'game-ended');
        expect(ended.winnerId).toBe(p2Id);
        expect(ended.winnerName).toBe('Bob');
        expect(ended.answer).toBe('correctanswer');
        expect(Array.isArray(ended.players)).toBe(true);
    });

    it('correct guess awards 10 points to the winner in game-ended players array', async () => {
        const { p2, p2Id, sessionId } = await startedGame();
        p2.emit('guess', { sessionId, playerId: p2Id, guess: 'correctanswer' });
        const ended = await waitFor<{ players: Array<{ id: string; score: number }> }>(
            p2, 'game-ended',
        );
        const winner = ended.players.find(p => p.id === p2Id);
        expect(winner?.score).toBe(10);
    });

    it('wrong guess emits guess-result { result: "wrong", attemptsLeft: 2 }', async () => {
        const { p2, p2Id, sessionId } = await startedGame();
        p2.emit('guess', { sessionId, playerId: p2Id, guess: 'wrong' });
        const result = await waitFor<{ result: string; attemptsLeft: number }>(p2, 'guess-result');
        expect(result.result).toBe('wrong');
        expect(result.attemptsLeft).toBe(2);
    });

    it('second wrong guess emits attemptsLeft: 1', async () => {
        const { p2, p2Id, sessionId } = await startedGame();
        p2.emit('guess', { sessionId, playerId: p2Id, guess: 'wrong' });
        await waitFor(p2, 'guess-result');
        p2.emit('guess', { sessionId, playerId: p2Id, guess: 'wrong2' });
        const result = await waitFor<{ attemptsLeft: number }>(p2, 'guess-result');
        expect(result.attemptsLeft).toBe(1);
    });

    it('third wrong guess emits attemptsLeft: 0', async () => {
        const { p2, p2Id, sessionId } = await startedGame();
        p2.emit('guess', { sessionId, playerId: p2Id, guess: 'wrong' });
        await waitFor(p2, 'guess-result');
        p2.emit('guess', { sessionId, playerId: p2Id, guess: 'wrong2' });
        await waitFor(p2, 'guess-result');
        p2.emit('guess', { sessionId, playerId: p2Id, guess: 'wrong3' });
        const result = await waitFor<{ attemptsLeft: number }>(p2, 'guess-result');
        expect(result.attemptsLeft).toBe(0);
    });

    it('fourth guess attempt (no attempts left) emits guess-result { result: "no-attempts" }', async () => {
        const { p2, p2Id, sessionId } = await startedGame();
        for (let i = 0; i < 3; i++) {
            p2.emit('guess', { sessionId, playerId: p2Id, guess: `wrong${i}` });
            await waitFor(p2, 'guess-result');
        }
        p2.emit('guess', { sessionId, playerId: p2Id, guess: 'wrong4' });
        const result = await waitFor<{ result: string }>(p2, 'guess-result');
        expect(result.result).toBe('no-attempts');
    });

    it('GM attempting to guess emits guess-result { result: "not-allowed" } or game-error', async () => {
        const { gm, gmId, sessionId } = await startedGame();
        const resultPromise = new Promise<string>((resolve) => {
            gm.once('guess-result', (r: { result: string }) => resolve(r.result));
            gm.once('game-error', () => resolve('game-error'));
        });
        gm.emit('guess', { sessionId, playerId: gmId, guess: 'correctanswer' });
        const result = await resultPromise;
        expect(['not-allowed', 'game-error']).toContain(result);
    });
});

// =============================================================================
// TIMER EXPIRY (unit tests with fake timers on GameSession directly)
// =============================================================================

describe('TIMER EXPIRY', () => {
    function buildSession(timerDuration = 60) {
        const session = new GameSession();
        const p1 = new Player('p1', 's1');
        const p2 = new Player('p2', 's2');
        const p3 = new Player('p3', 's3');
        session.addPlayer(p1);
        session.addPlayer(p2);
        session.addPlayer(p3);
        session.setQuestion('Q?', 'ans', p1.id, timerDuration);
        return { session, p1, p2, p3 };
    }

    it('after 60 seconds (+ 3s countdown), game-ended is emitted with winnerId: null', () => {
        jest.useFakeTimers();
        const { session, p1 } = buildSession(60);
        let endedWinnerId: string | null | undefined = undefined;
        session.onEnd = (_: GameSession, winnerId: string | null) => { endedWinnerId = winnerId; };
        session.start(p1.id);

        jest.advanceTimersByTime(62999);
        expect(endedWinnerId).toBeUndefined();
        jest.advanceTimersByTime(1);
        expect(endedWinnerId).toBeNull();
    });

    it('game-ended on timeout includes the correct answer in the answer field', () => {
        jest.useFakeTimers();
        const { session, p1 } = buildSession(60);
        session.setQuestion('Q?', 'thesecretanswer', p1.id, 60);

        let capturedAnswer: string | null = null;
        session.onEnd = (s: GameSession) => { capturedAnswer = s.getAnswer(); };
        session.start(p1.id);
        jest.advanceTimersByTime(63000);

        expect(capturedAnswer).toBe('thesecretanswer');
    });

    it('game-ended on timeout includes the players array with unchanged scores', () => {
        jest.useFakeTimers();
        const { session, p1 } = buildSession(60);

        let endedPlayers: Array<{ score: number }> | null = null;
        session.onEnd = (s: GameSession) => {
            endedPlayers = Array.from(s.players.values()).map(p => ({ score: p.score }));
        };
        session.start(p1.id);
        jest.advanceTimersByTime(63000);

        expect(endedPlayers).not.toBeNull();
        endedPlayers!.forEach(p => expect(p.score).toBe(0));
    });
});

// =============================================================================
// POST-ROUND STATE
// =============================================================================

describe('POST-ROUND STATE', () => {
    async function startedGame() {
        const { socket: gm, sessionId, playerId: gmId } = await createSession('Alice');
        const { socket: p2, playerId: p2Id } = await joinSession('Bob', sessionId);
        const { socket: p3 } = await joinSession('Carol', sessionId);
        gm.emit('set-question', { sessionId, playerId: gmId, question: 'Q?', answer: 'ans', duration: 30 });
        await waitFor(gm, 'question-set');
        gm.emit('start-game', { sessionId, playerId: gmId });
        await Promise.all([
            waitFor(gm, 'game-started'),
            waitFor(p2, 'game-started'),
            waitFor(p3, 'game-started'),
        ]);
        return { gm, gmId, p2, p2Id, p3, sessionId };
    }

    it('after game-ended, session-updated is emitted with status: "waiting"', async () => {
        const { p2, p2Id, gm, sessionId } = await startedGame();
        p2.emit('guess', { sessionId, playerId: p2Id, guess: 'ans' });
        await waitFor(p2, 'game-ended');
        const update = await waitFor<{ status: string }>(gm, 'session-updated', 2000);
        expect(update.status).toBe('waiting');
    });

    it('GM rotation: the player after the original GM in join order becomes new GM', async () => {
        const { p2, p2Id, gm, sessionId } = await startedGame();
        p2.emit('guess', { sessionId, playerId: p2Id, guess: 'ans' });
        await waitFor(p2, 'game-ended');
        const update = await waitFor<{ gameMasterId: string }>(gm, 'session-updated', 2000);
        expect(update.gameMasterId).toBe(p2Id);
    });

    it('new GM has isGameMaster: true in the session-updated players array', async () => {
        const { p2, p2Id, gm, sessionId } = await startedGame();
        p2.emit('guess', { sessionId, playerId: p2Id, guess: 'ans' });
        await waitFor(p2, 'game-ended');
        const update = await waitFor<{
            players: Array<{ id: string; isGameMaster: boolean }>;
        }>(gm, 'session-updated', 2000);
        const newGM = update.players.find(p => p.id === p2Id);
        expect(newGM?.isGameMaster).toBe(true);
    });
});

// =============================================================================
// DISCONNECT / SESSION CLEANUP (unit tests on GameSession)
// =============================================================================

describe('DISCONNECT / SESSION CLEANUP', () => {
    it('when all players are removed, the players map is empty', () => {
        const session = new GameSession();
        const p1 = new Player('p1', 's1');
        const p2 = new Player('p2', 's2');
        session.addPlayer(p1);
        session.addPlayer(p2);
        session.removePlayer(p1.id);
        session.removePlayer(p2.id);
        expect(session.players.size).toBe(0);
    });

    it('when GM is removed, next player is promoted to GM', () => {
        const session = new GameSession();
        const p1 = new Player('p1', 's1');
        const p2 = new Player('p2', 's2');
        session.addPlayer(p1);
        session.addPlayer(p2);
        expect(p1.isGameMaster).toBe(true);
        session.removePlayer(p1.id);
        expect(p2.isGameMaster).toBe(true);
    });
});

// =============================================================================
// VALIDATION
// =============================================================================

describe('VALIDATION', () => {
    async function startedGame() {
        const { socket: gm, sessionId, playerId: gmId } = await createSession('Alice');
        const { socket: p2, playerId: p2Id } = await joinSession('Bob', sessionId);
        const { socket: p3 } = await joinSession('Carol', sessionId);
        gm.emit('set-question', { sessionId, playerId: gmId, question: 'Q?', answer: 'ans', duration: 30 });
        await waitFor(gm, 'question-set');
        gm.emit('start-game', { sessionId, playerId: gmId });
        await Promise.all([
            waitFor(gm, 'game-started'),
            waitFor(p2, 'game-started'),
            waitFor(p3, 'game-started'),
        ]);
        return { gm, gmId, p2, p2Id, p3, sessionId };
    }

    it('guess with empty string emits game-error', async () => {
        const { p2, p2Id, sessionId } = await startedGame();
        p2.emit('guess', { sessionId, playerId: p2Id, guess: '' });
        const err = await waitFor<{ message: string }>(p2, 'game-error');
        expect(err.message).toBeDefined();
    });

    it('guess longer than 100 chars emits game-error', async () => {
        const { p2, p2Id, sessionId } = await startedGame();
        p2.emit('guess', { sessionId, playerId: p2Id, guess: 'a'.repeat(101) });
        const err = await waitFor<{ message: string }>(p2, 'game-error');
        expect(err.message).toBeDefined();
    });

    it('join-session with missing sessionId field emits game-error', async () => {
        const socket = newClient();
        await waitForConnect(socket);
        socket.emit('join-session', { username: 'Bob' });
        const err = await waitFor<{ message: string }>(socket, 'game-error');
        expect(err.message).toBeDefined();
    });
});

// =============================================================================
// TIMER DURATION
// =============================================================================

describe('TIMER DURATION', () => {
    it('start-game uses the custom duration from set-question when provided', () => {
        const session = new GameSession();
        const p1 = new Player('p1', 's1');
        session.addPlayer(p1);
        session.setQuestion('Q?', 'ans', p1.id, 45);
        expect(session.getTimerDuration()).toBe(45);
    });

    it('start-game defaults to 60s when no duration is provided', () => {
        const session = new GameSession();
        const p1 = new Player('p1', 's1');
        session.addPlayer(p1);
        session.setQuestion('Q?', 'ans', p1.id);
        expect(session.getTimerDuration()).toBe(60);
    });

    it('duration below 30 is clamped to 30', () => {
        const session = new GameSession();
        const p1 = new Player('p1', 's1');
        session.addPlayer(p1);
        session.setQuestion('Q?', 'ans', p1.id, 5);
        expect(session.getTimerDuration()).toBe(30);
    });

    it('duration above 120 is clamped to 120', () => {
        const session = new GameSession();
        const p1 = new Player('p1', 's1');
        session.addPlayer(p1);
        session.setQuestion('Q?', 'ans', p1.id, 999);
        expect(session.getTimerDuration()).toBe(120);
    });
});

// =============================================================================
// COUNTDOWN
// =============================================================================

describe('COUNTDOWN', () => {
    it('three game-countdown events fire with count 3, 2, 1 before timer-tick events begin', async () => {
        const { socket: gm, sessionId, playerId: gmId } = await createSession('Alice');
        const { socket: p2 } = await joinSession('Bob', sessionId);
        const { socket: p3 } = await joinSession('Carol', sessionId);
        gm.emit('set-question', { sessionId, playerId: gmId, question: 'Q?', answer: 'ans', duration: 30 });
        await waitFor(gm, 'question-set');

        const countdownCounts: number[] = [];
        const timerTicks: number[] = [];
        gm.on('game-countdown', ({ count }: { count: number }) => countdownCounts.push(count));
        gm.on('timer-tick', ({ timeLeft }: { timeLeft: number }) => timerTicks.push(timeLeft));

        gm.emit('start-game', { sessionId, playerId: gmId });
        await Promise.all([
            waitFor(gm, 'game-started'),
            waitFor(p2, 'game-started'),
            waitFor(p3, 'game-started'),
        ]);

        // Wait 3.5s: captures all countdown events but not yet any timer-tick
        await new Promise(r => setTimeout(r, 3500));
        expect(countdownCounts.slice(0, 3)).toEqual([3, 2, 1]);
        expect(timerTicks.length).toBe(0);
    }, 10000);

    it('no timer-tick events fire during the 3-second countdown window', async () => {
        const { socket: gm, sessionId, playerId: gmId } = await createSession('Alice');
        const { socket: p2 } = await joinSession('Bob', sessionId);
        const { socket: p3 } = await joinSession('Carol', sessionId);
        gm.emit('set-question', { sessionId, playerId: gmId, question: 'Q?', answer: 'ans', duration: 30 });
        await waitFor(gm, 'question-set');

        let timerTickCount = 0;
        gm.on('timer-tick', () => { timerTickCount++; });

        gm.emit('start-game', { sessionId, playerId: gmId });
        await Promise.all([
            waitFor(gm, 'game-started'),
            waitFor(p2, 'game-started'),
            waitFor(p3, 'game-started'),
        ]);

        // 2.5s is still within countdown window (timer starts at t=4s)
        await new Promise(r => setTimeout(r, 2500));
        expect(timerTickCount).toBe(0);
    }, 10000);
});

// =============================================================================
// QUESTION LOADING
// =============================================================================

describe('QUESTION LOADING', () => {
    it('get-session while in-progress receives session-updated with question populated', async () => {
        const { socket: gm, sessionId, playerId: gmId } = await createSession('Alice');
        const { socket: p2 } = await joinSession('Bob', sessionId);
        const { socket: p3 } = await joinSession('Carol', sessionId);
        gm.emit('set-question', { sessionId, playerId: gmId, question: 'What is love?', answer: 'ans', duration: 30 });
        await waitFor(gm, 'question-set');
        gm.emit('start-game', { sessionId, playerId: gmId });
        await Promise.all([
            waitFor(gm, 'game-started'),
            waitFor(p2, 'game-started'),
            waitFor(p3, 'game-started'),
        ]);

        const latecomer = newClient();
        await waitForConnect(latecomer);
        const updatePromise = waitFor<{ question: string | null; status: string }>(latecomer, 'session-updated');
        latecomer.emit('get-session', { sessionId });
        const data = await updatePromise;

        expect(data.status).toBe('in-progress');
        expect(data.question).toBe('What is love?');
    });
});
