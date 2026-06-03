export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const NOTION_QUALITY_DB_ID = process.env.NOTION_QUALITY_DB_ID;
  const NOTION_MEMORIES_DB_ID = process.env.NOTION_MEMORIES_DB_ID;

  try {
    // Check Quality Time DB
    const qRes = await fetch(
      `https://api.notion.com/v1/databases/${NOTION_QUALITY_DB_ID}/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify({ page_size: 5 }),
      }
    );
    const qData = await qRes.json();
    const qualityRaw = qData.results?.slice(0, 5).map(p => ({
      allProps: Object.fromEntries(
        Object.entries(p.properties).map(([k, v]) => [k, { type: v.type, value: v }])
      )
    }));

    return res.status(200).json({
      qualityTimeDB: NOTION_QUALITY_DB_ID || 'NOT SET',
      memoriesDB: NOTION_MEMORIES_DB_ID || 'NOT SET',
      qualityRaw,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
