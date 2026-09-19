import { unzipSync, strFromU8 } from "fflate";

/* =========================================================
   NCPOR BHARATI AWS ADAPTER

   The one genuinely public feed in this project, and the shape of the
   integration boundary around it.

   What it is: an undocumented Django view returning XLSX, discovered by
   reading the inline fetch() on data.ncpor.res.in. No authentication, no
   documented contract, no JSON. Treat it as scrape-grade.

   Three constraints this adapter has to live with, all verified first-hand:

   1. NO CORS HEADER. A browser cannot call it. That is why this runs
      server-side, and why the same code has to move to a real backend for
      any deployment beyond a dev machine.

   2. A HARD 100,000-ROW CAP WITH NO PAGINATION PARAMETER. A call for the
      current year returns 1 January onwards and stops about 77 days later.
      The rest of the year is structurally unreachable by this route. So the
      newest record this feed can hand you is months old, and calling it
      "live" would be a lie. We surface the reach-date instead.

   3. -999.0 IS THE MISSING-DATA SENTINEL, and sensors fail independently:
      the barometer has been measured missing 18.06% of the time while every
      other channel missed 0.68%. Health is per-instrument, never a station
      -wide boolean.
========================================================= */

const SENTINEL = -999;
const COLUMNS = ["tempr", "ap", "ws", "wd", "rh"];

export const AWS_ENDPOINT =
  "https://data.ncpor.res.in/get_filtered_data/" +
  "?data_set=Bharati%20-%20AWS&year={year}&columns=tempr,ap,ws,wd,rh";

export const VARIABLES = {
  tempr: { label: "Temperature", unit: "°C" },
  ap: { label: "Pressure", unit: "mbar" },
  ws: { label: "Wind", unit: "kt" },
  wd: { label: "Wind direction", unit: "°" },
  rh: { label: "Humidity", unit: "%" },
};

/** Excel serial date, epoch 1899-12-30, as the NCPOR sheet stores it. */
function serialToIso(serial) {
  const ms = (Number(serial) - 25569) * 86400000;
  return new Date(Math.round(ms)).toISOString();
}

/**
 * Pull rows out of the sheet XML directly.
 *
 * A full spreadsheet library would be a heavier dependency for a file whose
 * shape we already know: six numeric columns, no shared strings, no styling
 * that matters. Reading the XML is enough and keeps the adapter small.
 */
function parseSheet(xml) {
  const rows = [];
  const rowRe = /<row[^>]*>([\s\S]*?)<\/row>/g;
  const valRe = /<v>([^<]*)<\/v>/g;

  let rowMatch;
  let first = true;
  while ((rowMatch = rowRe.exec(xml)) !== null) {
    if (first) {
      first = false; // header
      continue;
    }
    const values = [];
    let v;
    valRe.lastIndex = 0;
    while ((v = valRe.exec(rowMatch[1])) !== null) values.push(Number(v[1]));
    if (values.length >= 6) rows.push(values);
  }
  return rows;
}

/**
 * Reduce the export to what a dashboard can honestly show: the newest
 * readable value per channel, and the availability of each channel measured
 * over the window we actually received.
 */
export function summarise(rows) {
  const total = rows.length;
  const health = {};
  const newest = {};

  COLUMNS.forEach((key, i) => {
    const col = i + 1; // column 0 is the timestamp
    let valid = 0;
    let latestValue = null;
    let latestAt = null;

    for (let r = 0; r < total; r++) {
      const value = rows[r][col];
      if (value === SENTINEL || !Number.isFinite(value)) continue;
      valid++;
      latestValue = value;
      latestAt = rows[r][0];
    }

    health[key] = {
      valid,
      missing: total - valid,
      missingPct: total ? ((total - valid) / total) * 100 : null,
    };
    newest[key] = {
      value: latestValue,
      at: latestAt == null ? null : serialToIso(latestAt),
      ...VARIABLES[key],
    };
  });

  return {
    rows: total,
    coverage: {
      from: total ? serialToIso(rows[0][0]) : null,
      to: total ? serialToIso(rows[total - 1][0]) : null,
    },
    // True when the export stopped at the cap rather than at the present.
    capped: total >= 100000,
    newest,
    health,
  };
}

/** Fetch one year and reduce it. Callers are expected to cache the result. */
export async function fetchAwsYear(year, fetchImpl = fetch) {
  const url = AWS_ENDPOINT.replace("{year}", String(year));
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`NCPOR responded ${res.status}`);

  const buf = new Uint8Array(await res.arrayBuffer());
  const files = unzipSync(buf);
  const sheetName = Object.keys(files).find((n) =>
    n.startsWith("xl/worksheets/sheet"),
  );
  if (!sheetName) throw new Error("no worksheet in NCPOR response");

  const summary = summarise(parseSheet(strFromU8(files[sheetName])));
  return { ...summary, year, source: url, fetchedAt: new Date().toISOString() };
}
