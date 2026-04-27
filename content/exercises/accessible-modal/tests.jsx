import { render, fireEvent, screen } from '@testing-library/react';
import Modal from './Starter';

test('renders nothing when open is false', () => {
  const { container } = render(
    <Modal open={false} title="Hi" onClose={() => {}} />,
  );
  expect(container.firstChild).toBeNull();
});

test('dialog has role, aria-modal, aria-labelledby', () => {
  render(<Modal open={true} title="Hello" onClose={() => {}} />);
  const dialog = screen.getByRole('dialog');
  expect(dialog.getAttribute('aria-modal')).toBe('true');
  expect(dialog.getAttribute('aria-labelledby')).toBe('modal-title');
  expect(document.getElementById('modal-title').textContent).toBe('Hello');
});

test('aria-describedby is set only when description is provided', () => {
  const { rerender } = render(
    <Modal open={true} title="t" onClose={() => {}} />,
  );
  expect(screen.getByRole('dialog').getAttribute('aria-describedby')).toBeNull();

  rerender(<Modal open={true} title="t" description="hi" onClose={() => {}} />);
  expect(screen.getByRole('dialog').getAttribute('aria-describedby')).toBe('modal-desc');
  expect(document.getElementById('modal-desc').textContent).toBe('hi');
});

test('close button has accessible name and triggers onClose', () => {
  let closed = 0;
  render(<Modal open={true} title="t" onClose={() => closed++} />);
  const btn = screen.getByLabelText('Close dialog');
  fireEvent.click(btn);
  expect(closed).toBe(1);
});

test('clicking the backdrop closes the modal', () => {
  let closed = 0;
  render(<Modal open={true} title="t" onClose={() => closed++} />);
  const backdrop = screen.getByTestId('modal-backdrop');
  fireEvent.click(backdrop);
  expect(closed).toBe(1);
});

test('clicking inside the dialog does not close', () => {
  let closed = 0;
  render(
    <Modal open={true} title="t" onClose={() => closed++}>
      <p data-testid="content">body</p>
    </Modal>,
  );
  fireEvent.click(screen.getByTestId('content'));
  fireEvent.click(screen.getByRole('dialog'));
  expect(closed).toBe(0);
});

test('ESC key closes the modal when open', () => {
  let closed = 0;
  render(<Modal open={true} title="t" onClose={() => closed++} />);
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(closed).toBe(1);
});

test('ESC key listener is removed when closed', () => {
  let closed = 0;
  const { rerender } = render(
    <Modal open={true} title="t" onClose={() => closed++} />,
  );
  rerender(<Modal open={false} title="t" onClose={() => closed++} />);
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(closed).toBe(0);
});

test('children render inside the dialog', () => {
  render(
    <Modal open={true} title="t" onClose={() => {}}>
      <p data-testid="kids">child node</p>
    </Modal>,
  );
  const kids = screen.getByTestId('kids');
  expect(kids.textContent).toBe('child node');
});
