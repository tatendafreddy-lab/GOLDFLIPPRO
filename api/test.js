export default function handler(req, res) {
  res.status(200).json({
    status: "ok",
    has_GOLD_API_KEY: !!process.env.GOLD_API_KEY,
    has_VITE_GOLD_API_KEY: !!process.env.VITE_GOLD_API_KEY,
    keyPreview:
      process.env.GOLD_API_KEY?.slice(0, 8) ||
      process.env.VITE_GOLD_API_KEY?.slice(0, 8) ||
      null,
  });
}
