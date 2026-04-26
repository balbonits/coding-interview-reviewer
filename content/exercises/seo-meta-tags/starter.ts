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

// TODO: implement buildPageMeta.
// See the problem statement for the full list of required metaTags and jsonLd fields.
export function buildPageMeta(_config: PageConfig): PageMeta {
  return {
    metaTags: [],
    canonical: '',
    jsonLd: {} as ArticleSchema,
  };
}
