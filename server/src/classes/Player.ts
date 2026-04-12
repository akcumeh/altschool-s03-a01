export class Player {
    id: string;
    username: string;
    score: number;
    socketId: string;
    isGameMaster: boolean;

    constructor(username: string, socketId: string) {
        this.id = crypto.randomUUID();
        this.username = username;
        this.score = 0;
        this.socketId = socketId;
        this.isGameMaster = false;
    }

    toJSON() {
        return {
            id: this.id,
            username: this.username,
            score: this.score,
            isGameMaster: this.isGameMaster,
        };
    }
}
