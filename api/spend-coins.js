export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const NOTION_PROFILE_DB_ID = process.env.NOTION_PROFILE_DB_ID;

  const headers = {
    'Authorization': `Bearer ${NOTION_TOKEN}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28',
  };

  const { coinCost, pageId, currentSpent } = req.body;

  try {
    // Find the Coin Spent property name
    const qr = await fetch(
      `https://api.notion.com/v1/databases/${NOTION_PROFILE_DB_ID}/query`,
      { method: 'POST', headers, body: JSON.stringify({ page_size: 1 }) }
    );
    const qd = await qr.json();
    const props = qd.results[0]?.properties || {};

    let spentPropName = '';
    let currentSpentVal = 0;
    for (const [key, val] of Object.entries(props)) {
      if (key.toLowerCase().includes('spent') || key.toLowerCase().includes('spend')) {
        if (val.type === 'number') {
          spentPropName = key;
          currentSpentVal = val.number ?? 0;
          break;
        }
      }
    }

    if (!spentPropName) return res.status(500).json({ error: 'Could not find Coin Spent property' });

    const profilePageId = qd.results[0].id;
    const newSpent = currentSpentVal + coinCost;

    const updateRes = await fetch(
      `https://api.notion.com/v1/pages/${profilePageId}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          properties: { [spentPropName]: { number: newSpent } }
        })
      }
    );

    if (!updateRes.ok) {
      const err = await updateRes.json();
      return res.status(500).json({ error: err.message });
    }

    return res.status(200).json({ success: true, newSpent });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
