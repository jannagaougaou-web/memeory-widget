export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const NOTION_MEMORIES_DB_ID = process.env.NOTION_MEMORIES_DB_ID;
  try {
    const response = await fetch(
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
    const data = await response.json();
    const raw = data.results?.slice(0, 3).map(page => ({
      title: page.properties['Memories']?.title?.[0]?.plain_text || '?',
      hoursRequired_raw: page.properties['Hours Required'],
      hoursTogether_raw: page.properties['Hours Together'],
      unlocked_raw: page.properties['Unlocked'],
    }));
    return res.status(200).json({ raw });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
