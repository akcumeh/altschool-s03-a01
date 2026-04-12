import { GameSession } from './GameSession';

class SessionManager {
    private sessions: Map<string, GameSession> = new Map();

    create(): GameSession {
        const session = new GameSession();
        this.sessions.set(session.id, session);
        return session;
    }

    get(sessionId: string): GameSession | undefined {
        return this.sessions.get(sessionId);
    }

    delete(sessionId: string): void {
        this.sessions.delete(sessionId);
    }

    getAll(): GameSession[] {
        return Array.from(this.sessions.values());
    }
}

export const sessionManager = new SessionManager();
