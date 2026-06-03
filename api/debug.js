export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const NOTION_QUALITY_DB_ID = process.env.NOTION_QUALITY_DB_ID;
  const NOTION_MEMORIES_DB_ID = process.env.NOTION_MEMORIES_DB_ID;

  try {
    // Test Quality Time
    const qRes = await fetch(
      `https://api.notion.com/v1/databases/${NOTION_QUALITY_DB_ID}/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify({ page_size: 3 }),
      }
    );
    const qData = await qRes.json();

    // Test Memories
    const mRes = await fetch(
      `https://api.notion.com/v1/databases/${NOTION_MEMORIES_DB_ID}/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify({ page_size: 3 }),
      }
    );
    const mData = await mRes.json();

    return res.status(200).json({
      token_first10: NOTION_TOKEN?.substring(0, 15) + '...',
      qualityDB: NOTION_QUALITY_DB_ID,
      memoriesDB: NOTION_MEMORIES_DB_ID,
      quality_status: qRes.status,
      quality_error: qData.message || qData.code || null,
      quality_count: qData.results?.length ?? 0,
      quality_first_props: qData.results?.[0]
        ? Object.keys(qData.results[0].properties)
        : [],
      quality_first_row: qData.results?.[0]?.properties
        ? Object.fromEntries(
            Object.entries(qData.results[0].properties).map(([k, v]) => [
              k, { type: v.type, number: v.number, formula: v.formula, rollup: v.rollup, title: v.title?.[0]?.plain_text }
            ])
          )
        : null,
      memories_status: mRes.status,
      memories_error: mData.message || mData.code || null,
      memories_count: mData.results?.length ?? 0,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}
