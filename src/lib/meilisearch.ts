/**
 * Meilisearch integration for fast full-text search
 * across the Tomodachi Shoes archive.
 */

import MeiliSearch from 'meilisearch';

const INDEX_NAME = 'tomodachi_shoes';

let client: MeiliSearch | null = null;

export function getSearchClient(): MeiliSearch {
  if (!client) {
    client = new MeiliSearch({
      host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
      apiKey: process.env.MEILISEARCH_API_KEY || '',
    });
  }
  return client;
}

export async function createSearchIndex(): Promise<void> {
  const c = getSearchClient();
  try {
    const index = c.index(INDEX_NAME);
    await index.updateSettings({
      searchableAttributes: [
        'name',
        'series',
        'jpLabel',
        'rarity',
        'category',
        'region',
        'tags',
        'collectionName',
        'designer',
      ],
      filterableAttributes: [
        'rarity',
        'category',
        'region',
        'status',
        'price',
        'resaleValue',
        'stock',
        'energyClass',
        'collectionId',
        'isActive',
      ],
      sortableAttributes: [
        'price',
        'resaleValue',
        'stock',
        'createdAt',
        'demandIndex',
      ],
      rankingRules: [
        'words',
        'typo',
        'proximity',
        'attribute',
        'sort',
        'exactness',
      ],
      distinctAttribute: null,
      displayedAttributes: [
        'id',
        'name',
        'slug',
        'series',
        'jpLabel',
        'rarity',
        'price',
        'resaleValue',
        'stock',
        'status',
        'region',
        'imageUrl',
        'thumbnailUrl',
        'category',
        'trend',
        'demandIndex',
      ],
    });
    console.log('[Meilisearch] Index created/updated');
  } catch (err) {
    console.error('[Meilisearch] Failed to create index:', err);
    throw err;
  }
}

export interface SearchDocument {
  id: string;
  name: string;
  slug: string;
  series: string;
  jpLabel: string;
  rarity: string;
  price: number;
  resaleValue: number;
  stock: number;
  status: string;
  region: string;
  imageUrl: string;
  thumbnailUrl: string;
  category: string;
  trend: string;
  demandIndex: number;
  tags: string[];
  collectionId?: string;
  collectionName?: string;
  designer?: string;
  energyClass?: string;
  isActive: boolean;
}

export async function indexShoe(doc: SearchDocument): Promise<void> {
  const c = getSearchClient();
  await c.index(INDEX_NAME).addDocuments([doc]);
}

export async function indexShoes(docs: SearchDocument[]): Promise<void> {
  const c = getSearchClient();
  await c.index(INDEX_NAME).addDocuments(docs);
}

export async function removeShoeFromIndex(shoeId: string): Promise<void> {
  const c = getSearchClient();
  await c.index(INDEX_NAME).deleteDocument(shoeId);
}

export async function searchShoes(
  query: string,
  options: {
    limit?: number;
    offset?: number;
    filters?: string[];
    sort?: string[];
  } = {}
) {
  const c = getSearchClient();
  const { limit = 24, offset = 0, filters, sort } = options;

  const filterStr = filters && filters.length > 0
    ? filters.join(' AND ')
    : undefined;

  return c.index(INDEX_NAME).search(query, {
    limit,
    offset,
    filter: filterStr,
    sort,
    attributesToHighlight: ['name', 'series'],
  });
}

export async function deleteSearchIndex(): Promise<void> {
  const c = getSearchClient();
  try {
    await c.deleteIndex(INDEX_NAME);
  } catch {
    // Index might not exist
  }
}
