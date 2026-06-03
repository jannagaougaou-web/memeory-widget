export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const NOTION_MEMORIES_DB_ID = process.env.NOTION_MEMORIES_DB_ID;

  if (!NOTION_TOKEN || !NOTION_MEMORIES_DB_ID) {
    return res.status(500).json({ error: 'Missing Notion credentials' });
  }

  try {
    let allResults = [];
    let cursor = undefined;

    do {
      const body = { page_size: 100 };
      if (cursor) body.start_cursor = cursor;

      const response = await fetch(
        `https://api.notion.com/v1/databases/${NOTION_MEMORIES_DB_ID}/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${NOTION_TOKEN}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28',
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        return res.status(500).json({ error: err.message || 'Notion API error' });
      }

      const data = await response.json();
      allResults = allResults.concat(data.results);
      cursor = data.has_more ? data.next_cursor : undefined;
    } while (cursor);

    const memories = allResults.map(page => {
      const props = page.properties;

      // Title/Memory name
      const titleProp = props['Memories'] || props['Name'] || props['Title'];
      const title = titleProp?.title?.[0]?.plain_text || 'Memory';

      // Course
      const course = props['Course']?.select?.name || props['Course']?.rich_text?.[0]?.plain_text || '';

      // Hours required
      const hoursRequired = props['Hours Required']?.number ?? 0;

      // Unlocked checkbox
      const unlocked = props['Unlocked']?.checkbox ?? false;

      // Hours together (current progress)
      const hoursTogether = props['Hours Together']?.number ?? 0;

      return { id: page.id, title, course, hoursRequired, unlocked, hoursTogether };
    });

    // Sort by hoursRequired ascending per course
    memories.sort((a, b) => a.hoursRequired - b.hoursRequired);

    return res.status(200).json({ memories });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
