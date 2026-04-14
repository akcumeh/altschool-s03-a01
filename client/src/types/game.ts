export type SessionStatus = 'waiting' | 'in-progress' | 'ended';

export interface PlayerData {
    id: string;
    username: string;
    score: number;
    isGameMaster: boolean;
}

export interface SessionState {
    id: string;
    status: SessionStatus;
    question: string | null;
    answer: string | null;
    players: PlayerData[];
    gameMasterId: string | null;
    timerDuration?: number;
}

export interface CountdownPayload { count: number; }

export type MessageType = 'system' | 'guess' | 'correct' | 'wrong' | 'info';

export interface ChatMessage {
    id: string;
    type: MessageType;
    username?: string;
    text: string;
    timestamp: number;
}

export interface GuessResult {
    result: 'correct' | 'wrong' | 'no-attempts' | 'not-allowed';
    attemptsLeft?: number;
    message?: string;
}

export interface GameEndedPayload {
    winnerId: string | null;
    winnerName: string | null;
    answer: string;
    players: PlayerData[];
}
