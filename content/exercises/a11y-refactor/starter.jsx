import { useState } from 'react';

// TODO: fix the five accessibility violations in this form.
//
// Rules:
//  - Do NOT change the visible text ("Your name", "Name is required", "Submit").
//  - Do NOT restructure the layout — only add/change attributes and element types.
//  - Each of the five tests names exactly one violation; fix them all.

export default function Starter() {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('Name is required');
    } else {
      setError('');
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 16 }}>
      {/* violation 3 & 4: plain div, not a live region; no id for aria-describedby */}
      <div style={{ color: '#dc2626', minHeight: 20 }}>{error}</div>

      {/* violation 1: no <label> — placeholder is not an accessible name */}
      <input
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ display: 'block', margin: '8px 0', padding: '6px 10px' }}
      />

      {/* violation 2: <div> with onClick — not keyboard-reachable */}
      <div
        onClick={handleSubmit}
        style={{
          display: 'inline-block',
          padding: '8px 16px',
          background: '#2563eb',
          color: '#fff',
          borderRadius: 4,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        Submit
      </div>
    </div>
  );
}
