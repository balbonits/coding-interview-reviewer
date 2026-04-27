function escapeString(s) {
  let out = '"';
  for (const ch of s) {
    if (ch === '\\') out += '\\\\';
    else if (ch === '"') out += '\\"';
    else if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (ch === '\t') out += '\\t';
    else if (ch === '\b') out += '\\b';
    else if (ch === '\f') out += '\\f';
    else if (ch.charCodeAt(0) < 0x20) {
      out += '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0');
    } else {
      out += ch;
    }
  }
  return out + '"';
}

function serializeValue(value) {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'null';
  }
  if (typeof value === 'string') return escapeString(value);
  if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol') {
    return undefined;
  }
  if (typeof value === 'object') {
    if (typeof value.toJSON === 'function') {
      return serializeValue(value.toJSON());
    }
    if (Array.isArray(value)) {
      const parts = value.map((v) => {
        const s = serializeValue(v);
        return s === undefined ? 'null' : s;
      });
      return '[' + parts.join(',') + ']';
    }
    const entries = [];
    for (const key of Object.keys(value)) {
      const s = serializeValue(value[key]);
      if (s !== undefined) {
        entries.push(escapeString(key) + ':' + s);
      }
    }
    return '{' + entries.join(',') + '}';
  }
  return undefined;
}

export function stringify(value) {
  return serializeValue(value);
}
