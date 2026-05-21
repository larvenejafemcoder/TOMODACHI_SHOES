import MeiliSearch from 'meilisearch';

const INDEX_NAME = "tomodachi_shoes";
let client = null;
function getSearchClient() {
  if (!client) {
    client = new MeiliSearch({
      host: process.env.MEILISEARCH_HOST || "http://localhost:7700",
      apiKey: process.env.MEILISEARCH_API_KEY || ""
    });
  }
  return client;
}
async function createSearchIndex() {
  const c = getSearchClient();
  try {
    const index = c.index(INDEX_NAME);
    await index.updateSettings({
      searchableAttributes: [
        "name",
        "series",
        "jpLabel",
        "rarity",
        "category",
        "region",
        "tags",
        "collectionName",
        "designer"
      ],
      filterableAttributes: [
        "rarity",
        "category",
        "region",
        "status",
        "price",
        "resaleValue",
        "stock",
        "energyClass",
        "collectionId",
        "isActive"
      ],
      sortableAttributes: [
        "price",
        "resaleValue",
        "stock",
        "createdAt",
        "demandIndex"
      ],
      rankingRules: [
        "words",
        "typo",
        "proximity",
        "attribute",
        "sort",
        "exactness"
      ],
      distinctAttribute: null,
      displayedAttributes: [
        "id",
        "name",
        "slug",
        "series",
        "jpLabel",
        "rarity",
        "price",
        "resaleValue",
        "stock",
        "status",
        "region",
        "imageUrl",
        "thumbnailUrl",
        "category",
        "trend",
        "demandIndex"
      ]
    });
    console.log("[Meilisearch] Index created/updated");
  } catch (err) {
    console.error("[Meilisearch] Failed to create index:", err);
    throw err;
  }
}
async function indexShoes(docs) {
  const c = getSearchClient();
  await c.index(INDEX_NAME).addDocuments(docs);
}

export { createSearchIndex as c, getSearchClient as g, indexShoes as i };
