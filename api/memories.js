export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const NOTION_MEMORIES_DB_ID = process.env.NOTION_MEMORIES_DB_ID;
  const NOTION_QUALITY_DB_ID = process.env.NOTION_QUALITY_DB_ID;

  const headers = {
    'Authorization': `Bearer ${NOTION_TOKEN}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28',
  };

  const fetchAll = async (dbId) => {
    let results = [], cursor;
    do {
      const body = { page_size: 100 };
      if (cursor) body.start_cursor = cursor;
      const r = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, { method: 'POST', headers, body: JSON.stringify(body) });
      const d = await r.json();
      results = results.concat(d.results || []);
      cursor = d.has_more ? d.next_cursor : undefined;
    } while (cursor);
    return results;
  };

  const fetchPage = async (pageId) => {
    const r = await fetch(`https://api.notion.com/v1/pages/${pageId}`, { headers });
    return r.json();
  };

  try {
    // ── Step 1: hoursMap from Quality Time ───────────────────────────────
    const hoursMap = {};
    const qualityPages = await fetchAll(NOTION_QUALITY_DB_ID);

    for (const page of qualityPages) {
      const props = page.properties;
      const courseName = props['Course']?.title?.[0]?.plain_text?.trim() || '';
      if (!courseName) continue;

      let hours = 0;
      for (const [key, val] of Object.entries(props)) {
        if (!key.toLowerCase().includes('hour') && !key.toLowerCase().includes('togth') && !key.toLowerCase().includes('toget')) continue;
        if (val.type === 'number' && val.number != null) { hours = val.number; break; }
        if (val.type === 'formula' && val.formula?.number != null) { hours = val.formula.number; break; }
        if (val.type === 'rollup' && val.rollup?.number != null) { hours = val.rollup.number; break; }
      }
      hoursMap[courseName] = hours;
    }

    // ── Step 2: Fetch memories ───────────────────────────────────────────
    const memPages = await fetchAll(NOTION_MEMORIES_DB_ID);

    // ── Step 3: For relation-type Course, fetch the related page title ───
    const courseCache = {}; // pageId → course name

    const getCourseFromRelation = async (relationPageId) => {
      if (courseCache[relationPageId]) return courseCache[relationPageId];
      try {
        const page = await fetchPage(relationPageId);
        // Title is usually first title property
        const name = Object.values(page.properties || {})
          .find(p => p.type === 'title')
          ?.title?.[0]?.plain_text?.trim() || '';
        courseCache[relationPageId] = name;
        return name;
      } catch { return ''; }
    };

    // ── Step 4: Build memories with course names ─────────────────────────
    const memories = await Promise.all(memPages.map(async (page) => {
      const props = page.properties;

      const title = props['Memories']?.title?.[0]?.plain_text
        || props['Name']?.title?.[0]?.plain_text
        || 'Memory';

      // Try select/rich_text/formula first
      let course = props['Course']?.select?.name
        || props['Course']?.rich_text?.[0]?.plain_text
        || props['Course']?.formula?.string
        || '';

      // If relation, fetch the related page title
      if (!course && props['Course']?.type === 'relation') {
        const relationId = props['Course']?.relation?.[0]?.id;
        if (relationId) course = await getCourseFromRelation(relationId);
      }

      const hoursRequired = props['Hours Required']?.number ?? 0;
      const hoursTogether = hoursMap[course] ?? 0;
      const unlocked = hoursRequired > 0 && hoursTogether >= hoursRequired;

      return { id: page.id, title, course, hoursRequired, unlocked, hoursTogether };
    }));

    memories.sort((a, b) => a.hoursRequired - b.hoursRequired);

    return res.status(200).json({ memories, hoursMap });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
