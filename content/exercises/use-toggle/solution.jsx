import { useState, useCallback } from 'react';

export function useToggle(initial = false) {
  const [value, setValue] = useState(Boolean(initial));

  const toggle = useCallback(() => {
    setValue((prev) => !prev);
  }, []);

  const setValueExternal = useCallback((next) => {
    setValue((prev) =>
      typeof next === 'function' ? Boolean(next(prev)) : Boolean(next),
    );
  }, []);

  return [value, toggle, setValueExternal];
}

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
