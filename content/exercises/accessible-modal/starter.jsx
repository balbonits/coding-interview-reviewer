import { useEffect } from 'react';

// Build an accessible modal:
//   - Returns null when open === false
//   - Backdrop (data-testid="modal-backdrop") calls onClose on click
//   - Dialog has role="dialog", aria-modal="true", aria-labelledby="modal-title"
//   - <h2 id="modal-title"> renders title
//   - Optional <p id="modal-desc"> + aria-describedby="modal-desc" when description is given
//   - Close <button aria-label="Close dialog"> calls onClose
//   - Click INSIDE the dialog must not close
//   - ESC key on the document closes the modal

export default function Modal({ open, title, description, onClose, children }) {
  // Your code here
  return null;
}
