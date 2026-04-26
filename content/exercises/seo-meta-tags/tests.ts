import { buildPageMeta, type MetaTag } from './starter';

const config = {
  title: 'How JavaScript Works',
  description: 'A deep dive into the V8 engine and the event loop.',
  url: 'https://example.com/posts/how-js-works',
  image: 'https://example.com/og/how-js-works.png',
  publishedAt: '2025-01-15',
};

// Helper: find a tag by name= or property=
function findTag(tags: MetaTag[], key: 'name' | 'property', value: string): MetaTag | undefined {
  return tags.find((t) => t[key] === value);
}

const { metaTags, canonical, jsonLd } = buildPageMeta(config);

test('includes name="description" with config.description', () => {
  expect(findTag(metaTags, 'name', 'description')?.content).toBe(config.description);
});

test('includes name="robots" with "index, follow"', () => {
  expect(findTag(metaTags, 'name', 'robots')?.content).toBe('index, follow');
});

test('includes og:type="article"', () => {
  expect(findTag(metaTags, 'property', 'og:type')?.content).toBe('article');
});

test('includes og:title with config.title', () => {
  expect(findTag(metaTags, 'property', 'og:title')?.content).toBe(config.title);
});

test('includes og:description with config.description', () => {
  expect(findTag(metaTags, 'property', 'og:description')?.content).toBe(config.description);
});

test('includes og:image with config.image', () => {
  expect(findTag(metaTags, 'property', 'og:image')?.content).toBe(config.image);
});

test('includes og:url with config.url', () => {
  expect(findTag(metaTags, 'property', 'og:url')?.content).toBe(config.url);
});

test('includes twitter:card="summary_large_image"', () => {
  expect(findTag(metaTags, 'name', 'twitter:card')?.content).toBe('summary_large_image');
});

test('includes twitter:title with config.title', () => {
  expect(findTag(metaTags, 'name', 'twitter:title')?.content).toBe(config.title);
});

test('canonical equals config.url', () => {
  expect(canonical).toBe(config.url);
});

test('jsonLd @context is "https://schema.org"', () => {
  expect(jsonLd['@context']).toBe('https://schema.org');
});

test('jsonLd @type is "Article"', () => {
  expect(jsonLd['@type']).toBe('Article');
});

test('jsonLd headline equals config.title', () => {
  expect(jsonLd.headline).toBe(config.title);
});

test('jsonLd datePublished equals config.publishedAt when provided', () => {
  expect(jsonLd.datePublished).toBe(config.publishedAt);
});

test('jsonLd datePublished is absent when publishedAt is omitted', () => {
  const { jsonLd: j } = buildPageMeta({ ...config, publishedAt: undefined });
  expect(j.datePublished).toBeUndefined();
});
