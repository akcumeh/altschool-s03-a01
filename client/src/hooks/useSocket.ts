import { useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
    if (!socketInstance) {
        const playerId = sessionStorage.getItem('playerId') ?? undefined;
        const sessionId = sessionStorage.getItem('sessionId') ?? undefined;

        socketInstance = io(SERVER_URL, {
            auth: { playerId, sessionId },
            autoConnect: true,
        });
    }
    return socketInstance;
}

export function resetSocket(): void {
    if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
    }
}

export function useSocket() {
    const socketRef = useRef<Socket>(getSocket());
    return socketRef.current;
}
