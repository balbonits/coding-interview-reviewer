import { useState } from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { useDebouncedValue } from './Starter';

function Tester({ initial, delay }) {
  const [value, setValue] = useState(initial);
  const debounced = useDebouncedValue(value, delay);
  return (
    <div>
      <span data-testid="debounced">{String(debounced)}</span>
      <button data-testid="set-b" onClick={() => setValue('b')}>set b</button>
      <button data-testid="set-c" onClick={() => setValue('c')}>set c</button>
    </div>
  );
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test('returns the initial value synchronously', () => {
  render(<Tester initial="a" delay={50} />);
  expect(screen.getByTestId('debounced').textContent).toBe('a');
});

test('updates after the delay elapses', async () => {
  render(<Tester initial="a" delay={50} />);
  fireEvent.click(screen.getByTestId('set-b'));
  expect(screen.getByTestId('debounced').textContent).toBe('a');
  await act(async () => {
    await wait(80);
  });
  expect(screen.getByTestId('debounced').textContent).toBe('b');
});

test('rapid changes only commit the latest value after a quiet delay', async () => {
  render(<Tester initial="a" delay={50} />);
  fireEvent.click(screen.getByTestId('set-b'));
  await act(async () => {
    await wait(25);
  });
  fireEvent.click(screen.getByTestId('set-c'));
  await act(async () => {
    await wait(25);
  });
  // Only 25ms of quiet — still showing 'a'
  expect(screen.getByTestId('debounced').textContent).toBe('a');
  await act(async () => {
    await wait(40);
  });
  expect(screen.getByTestId('debounced').textContent).toBe('c');
});
