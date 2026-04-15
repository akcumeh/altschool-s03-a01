import { render, screen } from '@testing-library/react';
import Timer from '../components/Timer';

describe('Timer', () => {
    test('displays timeLeft in seconds', () => {
        render(<Timer timeLeft={45} total={60} />);
        expect(screen.getByText('45s')).toBeInTheDocument();
    });

    test('bar width reflects remaining time proportion', () => {
        const { container } = render(<Timer timeLeft={30} total={60} />);
        const bar = container.querySelector('.timer__bar') as HTMLElement;
        expect(bar.style.width).toBe('50%');
    });

    test('uses default total of 60 when not provided', () => {
        const { container } = render(<Timer timeLeft={30} />);
        const bar = container.querySelector('.timer__bar') as HTMLElement;
        expect(bar.style.width).toBe('50%');
    });

    test('bar width does not go below 0%', () => {
        const { container } = render(<Timer timeLeft={0} total={60} />);
        const bar = container.querySelector('.timer__bar') as HTMLElement;
        expect(bar.style.width).toBe('0%');
    });

    test('applies no state class above 20 seconds', () => {
        const { container } = render(<Timer timeLeft={25} total={60} />);
        expect(container.querySelector('.timer__bar--warning')).not.toBeInTheDocument();
        expect(container.querySelector('.timer__bar--urgent')).not.toBeInTheDocument();
    });

    test('applies warning class between 11 and 20 seconds', () => {
        const { container } = render(<Timer timeLeft={15} total={60} />);
        expect(container.querySelector('.timer__bar--warning')).toBeInTheDocument();
        expect(container.querySelector('.timer__bar--urgent')).not.toBeInTheDocument();
    });

    test('applies urgent class at exactly 10 seconds', () => {
        const { container } = render(<Timer timeLeft={10} total={60} />);
        expect(container.querySelector('.timer__bar--urgent')).toBeInTheDocument();
        expect(container.querySelector('.timer__bar--warning')).not.toBeInTheDocument();
    });

    test('applies urgent class below 10 seconds', () => {
        const { container } = render(<Timer timeLeft={3} total={60} />);
        expect(container.querySelector('.timer__bar--urgent')).toBeInTheDocument();
    });

    test('applies pulse class to number when urgent', () => {
        const { container } = render(<Timer timeLeft={5} total={60} />);
        expect(container.querySelector('.timer__number--pulse')).toBeInTheDocument();
    });

    test('does not apply pulse class when not urgent', () => {
        const { container } = render(<Timer timeLeft={30} total={60} />);
        expect(container.querySelector('.timer__number--pulse')).not.toBeInTheDocument();
    });
});
