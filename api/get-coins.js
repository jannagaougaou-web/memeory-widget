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

    let totalEarned = 0;
    let coinSpent = 0;
    let availableCoins = 0;

    // Log all props for debugging
    const propSummary = {};
    for (const [key, val] of Object.entries(props)) {
      let v = null;
      if (val.type === 'number') v = val.number;
      else if (val.type === 'formula') v = val.formula?.number ?? val.formula?.string;
      else if (val.type === 'rollup') v = val.rollup?.number;
      propSummary[key] = { type: val.type, value: v };

      const k = key.toLowerCase();
      // Coin Balance formula
      if (k === 'coin balance' || k === 'coinbalance') {
        if (val.type === 'formula') availableCoins = val.formula?.number ?? 0;
        else if (val.type === 'number') availableCoins = val.number ?? 0;
      }
      // Total Coin Earned rollup
      if (k === 'total coin earned' || k === 'total coin earn') {
        if (val.type === 'rollup') totalEarned = val.rollup?.number ?? 0;
        else if (val.type === 'number') totalEarned = val.number ?? 0;
        else if (val.type === 'formula') totalEarned = val.formula?.number ?? 0;
      }
      // Coin Spent
      if (k === 'coin spent' || k === 'coins spent') {
        if (val.type === 'number') coinSpent = val.number ?? 0;
      }
    }

    // If Coin Balance formula returned 0 but we have earned/spent, compute manually
    if (availableCoins === 0 && totalEarned > 0) {
      availableCoins = Math.max(0, totalEarned - coinSpent);
    }

    return res.status(200).json({ availableCoins, coinSpent, totalEarned, pageId, propSummary });
  } catch (err) {
    return res.status(500).json({ error: err.message, availableCoins: 0 });
  }
}
