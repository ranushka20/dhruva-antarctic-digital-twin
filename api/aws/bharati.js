import { fetchAwsYear } from "../../server/ncpor-adapter.js";

// Production twin of the dev-only endpoint in server/vite-plugin-ncpor.js.
export default async function handler(_req, res) {
  try {
    const data = await fetchAwsYear(new Date().getUTCFullYear());
    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate");
    res.status(200).json({ ...data, cached: false });
  } catch (error) {
    res.status(502).json({
      error: String(error.message ?? error),
      reachedAt: new Date().toISOString(),
    });
  }
}
