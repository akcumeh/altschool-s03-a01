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

    setAsGameMaster(yes = true) {
        this.isGameMaster = yes;
    }

    setSocketId(socketId: string) {
        this.socketId = socketId;
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
