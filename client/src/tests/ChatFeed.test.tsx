import { render, screen } from '@testing-library/react';
import ChatFeed from '../components/ChatFeed';
import type { ChatMessage } from '../types/game';

function makeMsg(overrides: Partial<ChatMessage> & Pick<ChatMessage, 'type' | 'text'>): ChatMessage {
    return { id: Math.random().toString(), timestamp: 0, ...overrides };
}

describe('ChatFeed', () => {
    test('shows empty state when there are no messages', () => {
        render(<ChatFeed messages={[]} />);
        expect(screen.getByText('No messages yet. Say something!')).toBeInTheDocument();
    });

    test('does not show empty state when messages exist', () => {
        render(<ChatFeed messages={[makeMsg({ type: 'system', text: 'Hello' })]} />);
        expect(screen.queryByText('No messages yet. Say something!')).not.toBeInTheDocument();
    });

    test('renders message text', () => {
        render(<ChatFeed messages={[makeMsg({ type: 'system', text: 'Game started!' })]} />);
        expect(screen.getByText('Game started!')).toBeInTheDocument();
    });

    test('shows username for guess type messages', () => {
        const msg = makeMsg({ type: 'guess', username: 'Alice', text: 'Paris' });
        render(<ChatFeed messages={[msg]} />);
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Paris')).toBeInTheDocument();
    });

    test('does not render a username element for system messages', () => {
        const msg = makeMsg({ type: 'system', text: 'A player joined' });
        const { container } = render(<ChatFeed messages={[msg]} />);
        expect(container.querySelector('.chat-msg__username')).not.toBeInTheDocument();
    });

    test('applies chat-msg--correct class for correct messages', () => {
        const { container } = render(<ChatFeed messages={[makeMsg({ type: 'correct', text: 'Correct!' })]} />);
        expect(container.querySelector('.chat-msg--correct')).toBeInTheDocument();
    });

    test('applies chat-msg--wrong class for wrong messages', () => {
        const { container } = render(<ChatFeed messages={[makeMsg({ type: 'wrong', text: 'Wrong!' })]} />);
        expect(container.querySelector('.chat-msg--wrong')).toBeInTheDocument();
    });

    test('applies chat-msg--system class for system messages', () => {
        const { container } = render(<ChatFeed messages={[makeMsg({ type: 'system', text: 'System' })]} />);
        expect(container.querySelector('.chat-msg--system')).toBeInTheDocument();
    });

    test('applies chat-msg--guess class for guess messages', () => {
        const { container } = render(<ChatFeed messages={[makeMsg({ type: 'guess', text: 'My guess' })]} />);
        expect(container.querySelector('.chat-msg--guess')).toBeInTheDocument();
    });

    test('renders multiple messages', () => {
        const messages: ChatMessage[] = [
            makeMsg({ type: 'system', text: 'First' }),
            makeMsg({ type: 'system', text: 'Second' }),
            makeMsg({ type: 'system', text: 'Third' }),
        ];
        render(<ChatFeed messages={messages} />);
        expect(screen.getByText('First')).toBeInTheDocument();
        expect(screen.getByText('Second')).toBeInTheDocument();
        expect(screen.getByText('Third')).toBeInTheDocument();
    });
});
