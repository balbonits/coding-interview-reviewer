import { render, fireEvent, screen } from '@testing-library/react';
// React template: Sandpack mounts the file as /Starter.jsx, so the import uses capital S.
import { useToggle } from './Starter';

// A tiny harness that exposes the hook's behavior to the DOM,
// so we don't need renderHook (RTL version-dependent).
function Tester({ initial }) {
  const [value, toggle, setValue] = useToggle(initial);
  return (
    <div>
      <span data-testid="val">{String(value)}</span>
      <button data-testid="toggle" onClick={toggle}>
        toggle
      </button>
      <button data-testid="set-true" onClick={() => setValue(true)}>
        set true
      </button>
      <button data-testid="set-false" onClick={() => setValue(false)}>
        set false
      </button>
      <button data-testid="set-fn" onClick={() => setValue((v) => !v)}>
        set fn
      </button>
    </div>
  );
}

test('defaults to false when no initial value is passed', () => {
  render(<Tester />);
  expect(screen.getByTestId('val').textContent).toBe('false');
});

test('respects initial=true', () => {
  render(<Tester initial={true} />);
  expect(screen.getByTestId('val').textContent).toBe('true');
});

test('toggle flips the value', () => {
  render(<Tester />);
  fireEvent.click(screen.getByTestId('toggle'));
  expect(screen.getByTestId('val').textContent).toBe('true');
  fireEvent.click(screen.getByTestId('toggle'));
  expect(screen.getByTestId('val').textContent).toBe('false');
});

test('multiple rapid toggles do not stale-close on the value', () => {
  render(<Tester />);
  const btn = screen.getByTestId('toggle');
  fireEvent.click(btn);
  fireEvent.click(btn);
  fireEvent.click(btn);
  expect(screen.getByTestId('val').textContent).toBe('true');
});

test('setValue accepts a boolean directly', () => {
  render(<Tester />);
  fireEvent.click(screen.getByTestId('set-true'));
  expect(screen.getByTestId('val').textContent).toBe('true');
  fireEvent.click(screen.getByTestId('set-false'));
  expect(screen.getByTestId('val').textContent).toBe('false');
});

test('setValue accepts an updater function', () => {
  render(<Tester initial={false} />);
  fireEvent.click(screen.getByTestId('set-fn'));
  expect(screen.getByTestId('val').textContent).toBe('true');
  fireEvent.click(screen.getByTestId('set-fn'));
  expect(screen.getByTestId('val').textContent).toBe('false');
});
