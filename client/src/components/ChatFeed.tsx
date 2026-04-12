import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../types/game';
import './ChatFeed.css';

interface Props {
  messages: ChatMessage[];
}

export default function ChatFeed({ messages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chat-feed">
      {messages.length === 0 && (
        <p className="chat-feed__empty">No messages yet. Say something!</p>
      )}
      {messages.map(msg => (
        <div key={msg.id} className={`chat-msg chat-msg--${msg.type}`}>
          {msg.type === 'guess' && msg.username && (
            <span className="chat-msg__username">{msg.username}</span>
          )}
          <span className="chat-msg__text">{msg.text}</span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
