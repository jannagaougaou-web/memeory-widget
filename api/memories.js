export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const NOTION_MEMORIES_DB_ID = process.env.NOTION_MEMORIES_DB_ID;
  const NOTION_QUALITY_DB_ID = process.env.NOTION_QUALITY_DB_ID;

  if (!NOTION_TOKEN || !NOTION_MEMORIES_DB_ID) {
    return res.status(500).json({ error: 'Missing Notion credentials' });
  }

  const headers = {
    'Authorization': `Bearer ${NOTION_TOKEN}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28',
  };

  try {
    // ── Step 1: Fetch Quality Time hours per course ──────────────────────────
    const hoursMap = {}; // { CourseName: hoursFloat }

    if (NOTION_QUALITY_DB_ID) {
      let cursor = undefined;
      do {
        const body = { page_size: 100 };
        if (cursor) body.start_cursor = cursor;
        const qRes = await fetch(
          `https://api.notion.com/v1/databases/${NOTION_QUALITY_DB_ID}/query`,
          { method: 'POST', headers, body: JSON.stringify(body) }
        );
        const qData = await qRes.json();

        for (const page of qData.results || []) {
          const props = page.properties;

          // Course name — it's the title property
          const courseName =
            props['Course']?.title?.[0]?.plain_text ||
            props['Name']?.title?.[0]?.plain_text ||
            '';

          // Hours Together — try multiple property names
          const htProp =
            props['Hours Togther'] ||   // note: typo in your DB "Togther"
            props['Hours Together'] ||
            props['Hours_Together'];

          let hours = 0;
          if (htProp?.type === 'number') hours = htProp.number ?? 0;
          else if (htProp?.type === 'formula') hours = htProp.formula?.number ?? 0;
          else if (htProp?.type === 'rollup') {
            const r = htProp.rollup;
            if (r?.type === 'number') hours = r.number ?? 0;
          }

          if (courseName) hoursMap[courseName] = hours;
        }

        cursor = qData.has_more ? qData.next_cursor : undefined;
      } while (cursor);
    }

    // ── Step 2: Fetch Memories ───────────────────────────────────────────────
    let allResults = [];
    let cursor = undefined;
    do {
      const body = { page_size: 100 };
      if (cursor) body.start_cursor = cursor;
      const mRes = await fetch(
        `https://api.notion.com/v1/databases/${NOTION_MEMORIES_DB_ID}/query`,
        { method: 'POST', headers, body: JSON.stringify(body) }
      );
      const mData = await mRes.json();
      allResults = allResults.concat(mData.results || []);
      cursor = mData.has_more ? mData.next_cursor : undefined;
    } while (cursor);

    const memories = allResults.map(page => {
      const props = page.properties;

      // Title
      const titleProp = props['Memories'] || props['Name'] || props['Title'];
      const title = titleProp?.title?.[0]?.plain_text || 'Memory';

      // Course
      const course =
        props['Course']?.select?.name ||
        props['Course']?.rich_text?.[0]?.plain_text ||
        '';

      // Hours Required
      const hoursRequired = props['Hours Required']?.number ?? 0;

      // Hours Together — from Quality Time map
      const hoursTogether = hoursMap[course] ?? 0;

      // Unlocked — compute directly from hours
      const unlocked = hoursRequired > 0 && hoursTogether >= hoursRequired;

      return { id: page.id, title, course, hoursRequired, unlocked, hoursTogether };
    });

    memories.sort((a, b) => a.hoursRequired - b.hoursRequired);

    return res.status(200).json({ memories, hoursMap });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
