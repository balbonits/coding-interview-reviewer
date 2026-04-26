import { useState } from 'react';

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
      {/* fix 3 & 4: role="alert" makes this a live region; id enables aria-describedby */}
      <div
        id="name-error"
        role="alert"
        style={{ color: '#dc2626', minHeight: 20 }}
      >
        {error}
      </div>

      {/* fix 1: <label htmlFor> provides a programmatic label */}
      <label htmlFor="name-input" style={{ display: 'block', marginTop: 8 }}>
        Your name
      </label>
      {/* fix 4 & 5: aria-describedby links input to error; aria-invalid signals validation state */}
      <input
        id="name-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-describedby={error ? 'name-error' : undefined}
        aria-invalid={error ? 'true' : undefined}
        style={{ display: 'block', margin: '8px 0', padding: '6px 10px' }}
      />

      {/* fix 2: native <button> is keyboard-focusable and fires click on Enter/Space */}
      <button
        type="button"
        onClick={handleSubmit}
        style={{
          padding: '8px 16px',
          background: '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
        }}
      >
        Submit
      </button>
    </div>
  );
}
