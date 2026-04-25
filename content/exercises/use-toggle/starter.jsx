import { useState, useCallback } from 'react';

// TODO: implement useToggle.
// Signature: const [value, toggle, setValue] = useToggle(initial = false);
export function useToggle(initial = false) {
  // your code here
}

// Default export is a small visual demo (not under test).
export default function Toggle() {
  const [on, toggle] = useToggle(false);
  return (
    <button
      onClick={toggle}
      style={{
        padding: '8px 16px',
        background: on ? '#22c55e' : '#374151',
        color: 'white',
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
      }}
    >
      {on ? 'ON' : 'OFF'}
    </button>
  );
}
