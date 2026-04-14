import { Player } from './Player';

type SessionStatus = 'waiting' | 'in-progress' | 'ended';
type GuessType = 'correct' | 'wrong' | 'no-attempts' | 'not-allowed';

export class GameSession {
    id: string;
    status: SessionStatus;
    players: Map<string, Player>;
    private joinOrder: string[];
    private gameMasterId: string | null;
    private question: string | null;
    private answer: string | null;
    private attempts: Map<string, number>;
    private timer: ReturnType<typeof setTimeout> | null;
    onEnd: ((session: GameSession, winnerId: string | null) => void) | null;
    
    constructor() {
        this.id = crypto.randomUUID();
        this.status = 'waiting';
        this.players = new Map();
        this.joinOrder = [];
        this.gameMasterId = null;
        this.question = null;
        this.answer = null;
        this.attempts = new Map();
        this.timer = null;
        this.onEnd = null;
    }

    addPlayer(player: Player): void {
        if (this.players.size === 0) {
            player.setAsGameMaster();
            this.gameMasterId = player.id;
        }
        this.players.set(player.id, player);
        this.joinOrder.push(player.id);
    }

    removePlayer(playerId: string): void {
        this.players.delete(playerId);
        this.joinOrder = this.joinOrder.filter(id => id !== playerId);

        if (playerId === this.gameMasterId && this.joinOrder.length > 0) {
            this.promoteNextGameMaster();
        } else if (playerId === this.gameMasterId && this.joinOrder.length === 0) {
            this.end(null);
        }
    }

    private promoteNextGameMaster(): void {
        const nextId = this.joinOrder[0];
        const nextPlayer = this.players.get(nextId);
        if (!nextPlayer) this.end(null);
        nextPlayer?.setAsGameMaster();
        this.gameMasterId = nextId;
    }

    canStart(): boolean {
        return this.players.size >= 3 && this.status === 'waiting';
    }

    setQuestion(question: string, answer: string, requesterId: string): boolean {
        if (requesterId !== this.gameMasterId) return false;
        this.question = question;
        this.answer = answer.toLowerCase().trim();
        return true;
    }

    start(requesterId: string): boolean {
        if (requesterId !== this.gameMasterId) return false;
        if (!this.canStart()) return false;
        if (!this.question || !this.answer) return false;

        this.status = 'in-progress';
        this.players.forEach(player => {
            if (!player.isGameMaster) this.attempts.set(player.id, 3);
        });

        this.timer = setTimeout(() => {
            this.end(null);
        }, 60000);

        return true;
    }

    guess(playerId: string, guessText: string): GuessType {
        if (this.status !== 'in-progress') return 'not-allowed';
        if (playerId === this.gameMasterId) return 'not-allowed';

        const remaining = this.attempts.get(playerId) ?? 0;
        if (remaining <= 0) return 'no-attempts';

        this.attempts.set(playerId, remaining - 1);

        if (guessText.toLowerCase().trim() === this.answer) {
            const player = this.players.get(playerId)!;
            player.score += 10;
            this.end(playerId);
            return 'correct';
        }

        return 'wrong';
    }

    end(winnerId: string | null): void {
        if (this.status === 'ended') return;
        this.status = 'ended';

        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        if (this.onEnd) this.onEnd(this, winnerId);

        if (this.joinOrder.length > 0) {
            const currentGM = this.gameMasterId;
            this.players.forEach(p => (p.setAsGameMaster(false)));
            this.gameMasterId = null;

            const currentGMIndex = this.joinOrder.indexOf(currentGM!);
            const nextIndex = (currentGMIndex + 1) % this.joinOrder.length;
            const nextId = this.joinOrder[nextIndex];
            const nextPlayer = this.players.get(nextId);
            if (nextPlayer) {
                nextPlayer.setAsGameMaster();
                this.gameMasterId = nextId;
            }

            this.status = 'waiting';
            this.question = null;
            this.answer = null;
            this.attempts.clear();
        }
    }

    getPublicState() {
        return {
            id: this.id,
            status: this.status,
            question: this.status === 'in-progress' ? this.question : null,
            answer: this.status === 'ended' ? this.answer : null,
            players: Array.from(this.players.values()).map(p => p.toJSON()),
            gameMasterId: this.gameMasterId,
        };
    }

    getAnswer(): string | null {
        return this.answer;
    }

    getGameMasterId(): string | null {
        return this.gameMasterId;
    }

    getRemainingAttempts(playerId: string): number {
        return this.attempts.get(playerId) ?? 0;
    }
}
