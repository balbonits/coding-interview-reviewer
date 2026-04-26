import { render, fireEvent, screen } from '@testing-library/react';
// React template: Sandpack mounts the file as /Starter.jsx, so the import uses capital S.
import Starter from './Starter';

// Each test targets exactly one of the five violations.

test('input has an accessible label (not just a placeholder)', () => {
  render(<Starter />);
  // getByLabelText throws if no <label>, aria-label, or aria-labelledby links to the input.
  // placeholder text is NOT an accessible name.
  expect(screen.getByLabelText(/your name/i)).toBeTruthy();
});

test('submit control has button role and an accessible name', () => {
  render(<Starter />);
  // getByRole('button') throws if no <button> or element with role="button" exists.
  // A plain <div onClick> has role="generic" — it will NOT match.
  expect(screen.getByRole('button', { name: /submit/i })).toBeTruthy();
});

test('error region is a live region (role=alert or aria-live)', () => {
  render(<Starter />);
  fireEvent.click(screen.getByRole('button', { name: /submit/i }));
  const errorText = screen.getByText(/name is required/i);
  // Walk up to find the nearest live region ancestor (or the element itself).
  const liveEl =
    errorText.closest('[role="alert"], [aria-live]') ?? errorText;
  const isLive =
    liveEl.getAttribute('role') === 'alert' ||
    liveEl.getAttribute('aria-live') != null;
  expect(isLive).toBe(true);
});

test('input links to the error message via aria-describedby when invalid', () => {
  render(<Starter />);
  fireEvent.click(screen.getByRole('button', { name: /submit/i }));
  const input = screen.getByLabelText(/your name/i);
  const id = input.getAttribute('aria-describedby');
  expect(id).toBeTruthy();
  const errorEl = document.getElementById(id);
  expect(errorEl).not.toBeNull();
  expect(errorEl.textContent).toMatch(/name is required/i);
});

test('input carries aria-invalid="true" when there is a validation error', () => {
  render(<Starter />);
  fireEvent.click(screen.getByRole('button', { name: /submit/i }));
  const input = screen.getByLabelText(/your name/i);
  expect(input.getAttribute('aria-invalid')).toBe('true');
});
