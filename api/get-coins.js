export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const NOTION_PROFILE_DB_ID = process.env.NOTION_PROFILE_DB_ID;

  const headers = {
    'Authorization': `Bearer ${NOTION_TOKEN}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28',
  };

  try {
    const r = await fetch(
      `https://api.notion.com/v1/databases/${NOTION_PROFILE_DB_ID}/query`,
      { method: 'POST', headers, body: JSON.stringify({ page_size: 1 }) }
    );
    const data = await r.json();
    if (!data.results?.length) return res.status(404).json({ error: 'Profile not found', availableCoins: 0 });

    const props = data.results[0].properties;
    const pageId = data.results[0].id;

    // Read Coin Balance (formula)
    let availableCoins = 0;
    let coinSpent = 0;
    for (const [key, val] of Object.entries(props)) {
      const k = key.toLowerCase();
      if (k.includes('balance') || (k.includes('coin') && k.includes('balance'))) {
        if (val.type === 'number') availableCoins = val.number ?? 0;
        else if (val.type === 'formula') availableCoins = val.formula?.number ?? 0;
        else if (val.type === 'rollup') availableCoins = val.rollup?.number ?? 0;
      }
      if (k.includes('spent') || k.includes('spend')) {
        if (val.type === 'number') coinSpent = val.number ?? 0;
      }
    }

    return res.status(200).json({ availableCoins, coinSpent, pageId });
  } catch (err) {
    return res.status(500).json({ error: err.message, availableCoins: 0 });
  }
}
