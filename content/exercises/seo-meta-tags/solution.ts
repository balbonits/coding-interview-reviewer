export interface PageConfig {
  title: string;
  description: string;
  url: string;
  image: string;
  publishedAt?: string;
}

export interface MetaTag {
  name?: string;
  property?: string;
  content: string;
}

export interface ArticleSchema {
  '@context': 'https://schema.org';
  '@type': 'Article' | 'WebPage';
  headline: string;
  description: string;
  image: string;
  url: string;
  datePublished?: string;
}

export interface PageMeta {
  metaTags: MetaTag[];
  canonical: string;
  jsonLd: ArticleSchema;
}

export function buildPageMeta(config: PageConfig): PageMeta {
  const metaTags: MetaTag[] = [
    { name: 'description', content: config.description },
    { name: 'robots', content: 'index, follow' },
    { property: 'og:type', content: 'article' },
    { property: 'og:title', content: config.title },
    { property: 'og:description', content: config.description },
    { property: 'og:image', content: config.image },
    { property: 'og:url', content: config.url },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: config.title },
    { name: 'twitter:description', content: config.description },
    { name: 'twitter:image', content: config.image },
  ];

  const jsonLd: ArticleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: config.title,
    description: config.description,
    image: config.image,
    url: config.url,
    ...(config.publishedAt ? { datePublished: config.publishedAt } : {}),
  };

  return {
    metaTags,
    canonical: config.url,
    jsonLd,
  };
}
