export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const apiKey =
    req.headers["x-access-token"] ||
    req.headers["x-gold-key"] ||
    process.env.GOLD_API_KEY ||
    process.env.VITE_GOLD_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "API key not configured",
      hint: "Set GOLD_API_KEY (and/or VITE_GOLD_API_KEY) in Vercel env vars",
    });
  }

  const endpoints = [
    "https://www.gold-api.com/price/XAU",
    "https://gold-api.com/price/XAU",
    "https://api.gold-api.com/price/XAU",
  ];

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        headers: { "x-access-token": apiKey },
      });
      const text = await response.text();
      console.log("Gold-API raw response from", url, "=>", text.slice(0, 300));

      if (!response.ok) {
        console.error("Gold-API HTTP", response.status, "body:", text);
        continue;
      }

      try {
        const data = JSON.parse(text);
        if (typeof data.price === "number" && data.price > 0) {
          return res.status(200).json(data);
        }
        console.error("Gold-API missing price field:", text);
      } catch (parseErr) {
        console.error("Gold-API JSON parse error from", url, ":", parseErr.message);
      }
    } catch (err) {
      console.error("Gold-API fetch error from", url, "=>", err.message);
    }
  }

  return res
    .status(502)
    .json({ error: "Gold-API failed on all endpoints. Check logs and API key." });
}
