function sizeFor(weight) {
  return `${0.75 + weight * 0.15}em`;
}

export default function TagCloud({ tags }) {
  return (
    <ul>
      {tags.map((tag) => (
        <li key={tag.label}>
          <a href="#" style={{ fontSize: sizeFor(tag.weight) }}>
            {tag.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
