import { fetchAwsYear } from "./ncpor-adapter.js";

/* =========================================================
   DEV-ONLY ADAPTER ENDPOINT

   This exists because the NCPOR view sends no CORS header, so the browser
   cannot call it. In a deployment the same adapter belongs behind a real
   backend; the client contract below is deliberately the one a real service
   would expose, so nothing on the client has to change when it moves.
========================================================= */

// The upstream export cannot advance past its row cap, so there is nothing
// to gain from refetching often. Half an hour is generous.
const TTL_MS = 30 * 60 * 1000;

export function ncporAdapter() {
  let cache = null;

  return {
    name: "ncpor-aws-adapter",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/aws/bharati", async (_req, res) => {
        res.setHeader("Content-Type", "application/json");

        if (cache && Date.now() - cache.at < TTL_MS) {
          res.end(JSON.stringify({ ...cache.data, cached: true }));
          return;
        }

        try {
          const data = await fetchAwsYear(new Date().getUTCFullYear());
          cache = { at: Date.now(), data };
          res.end(JSON.stringify({ ...data, cached: false }));
        } catch (error) {
          // A failure here is itself information: the station's only public
          // feed being unreachable is exactly the condition the twin is
          // supposed to make visible rather than hide.
          res.statusCode = 502;
          res.end(
            JSON.stringify({
              error: String(error.message ?? error),
              reachedAt: new Date().toISOString(),
            }),
          );
        }
      });
    },
  };
}
