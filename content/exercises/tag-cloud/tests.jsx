import { render } from '@testing-library/react';
import TagCloud from './Starter';

const sample = [
  { label: 'react', weight: 10 },
  { label: 'css', weight: 5 },
  { label: 'html', weight: 1 },
];

test('renders a <ul> with one <li> per tag', () => {
  const { container } = render(<TagCloud tags={sample} />);
  const ul = container.querySelector('ul');
  expect(ul).not.toBeNull();
  const items = container.querySelectorAll('ul > li');
  expect(items).toHaveLength(3);
});

test('each tag is wrapped in an <a href="#"> for focus', () => {
  const { container } = render(<TagCloud tags={sample} />);
  const links = container.querySelectorAll('ul > li > a');
  expect(links).toHaveLength(3);
  for (const a of links) {
    expect(a.getAttribute('href')).toBe('#');
  }
});

test('font size scales with weight via the formula', () => {
  const { container } = render(<TagCloud tags={sample} />);
  const links = container.querySelectorAll('ul > li > a');
  // sample order: react (10), css (5), html (1)
  expect(links[0].style.fontSize).toBe('2.25em');
  expect(links[1].style.fontSize).toBe('1.5em');
  expect(links[2].style.fontSize).toBe('0.9em');
});

test('empty list renders an empty <ul> without error', () => {
  const { container } = render(<TagCloud tags={[]} />);
  expect(container.querySelector('ul')).not.toBeNull();
  expect(container.querySelectorAll('ul > li')).toHaveLength(0);
});

test('label text appears verbatim', () => {
  const { container } = render(
    <TagCloud tags={[{ label: 'TypeScript', weight: 7 }]} />,
  );
  expect(container.textContent).toContain('TypeScript');
});
