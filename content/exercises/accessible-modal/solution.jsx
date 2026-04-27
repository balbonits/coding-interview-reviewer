import { useEffect } from 'react';

export default function Modal({ open, title, description, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const ariaProps = {
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'modal-title',
  };
  if (description) ariaProps['aria-describedby'] = 'modal-desc';

  return (
    <div
      data-testid="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div {...ariaProps}>
        <h2 id="modal-title">{title}</h2>
        {description ? <p id="modal-desc">{description}</p> : null}
        <button aria-label="Close dialog" onClick={onClose}>
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
