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

      // Title
      const titleProp = props['Memories'] || props['Name'] || props['Title'];
      const title = titleProp?.title?.[0]?.plain_text || 'Memory';

      // Course — handle select or rich_text
      const course =
        props['Course']?.select?.name ||
        props['Course']?.rich_text?.[0]?.plain_text ||
        '';

      // Hours Required
      const hoursRequired = props['Hours Required']?.number ?? 0;

      // Hours Together — could be number, formula, or rollup
      const htProp = props['Hours Together'];
      let hoursTogether = 0;
      if (htProp?.type === 'number') hoursTogether = htProp.number ?? 0;
      else if (htProp?.type === 'formula') hoursTogether = htProp.formula?.number ?? 0;
      else if (htProp?.type === 'rollup') hoursTogether = htProp.rollup?.number ?? 0;

      // Unlocked — checkbox, formula boolean, or compute from hours
      const unlockedProp = props['Unlocked'];
      let unlocked = false;
      if (unlockedProp?.type === 'checkbox') {
        unlocked = unlockedProp.checkbox ?? false;
      } else if (unlockedProp?.type === 'formula') {
        unlocked = unlockedProp.formula?.boolean ?? false;
      } else {
        // Fallback: compute directly from hours
        unlocked = hoursRequired > 0 && hoursTogether >= hoursRequired;
      }

      // Always also compute from hours as a safety fallback
      if (!unlocked && hoursRequired > 0 && hoursTogether >= hoursRequired) {
        unlocked = true;
      }

      return { id: page.id, title, course, hoursRequired, unlocked, hoursTogether };
    });

    memories.sort((a, b) => a.hoursRequired - b.hoursRequired);

    return res.status(200).json({ memories });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
