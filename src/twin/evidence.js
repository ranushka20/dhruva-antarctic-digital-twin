/* =========================================================
   EVIDENCE CLASSIFICATION

   Every fact this twin displays carries a class, because the project's
   stated differentiator is knowing the difference between what NCPOR
   publishes, what is documented but not streamed, and what we made up.

   The scheme is the dossier's own (SIH-26060-evidence-dossier.md §1):
========================================================= */

export const EVIDENCE = {
  A: {
    id: "A",
    label: "Verified",
    description: "Real and publicly accessible. Cited and reproducible.",
    tone: "success",
  },
  AEXT: {
    id: "A-ext",
    label: "Industry standard",
    description:
      "A real, citable public figure that is not Bharati-specific — an OEM, ISO or other-station standard. Never Bharati's own measured value.",
    tone: "info",
  },
  B: {
    id: "B",
    label: "Not connected",
    description:
      "Real and documented, but no public feed exists. This is an integration boundary, not a reading.",
    tone: "muted",
  },
  C: {
    id: "C",
    label: "Unconfirmed",
    description: "Existence confirmed or plausible; details not public.",
    tone: "muted",
  },
  D: {
    id: "D",
    label: "Derived",
    description: "Inferred or modelled from verified anchors. Not measured.",
    tone: "warning",
  },
  S: {
    id: "S",
    label: "Simulated",
    description: "Synthetic demo value. Carries no claim about the station.",
    tone: "warning",
  },
};

/**
 * Build a displayable fact.
 * `cls` is mandatory — a field cannot be added without declaring provenance.
 */
export function fact(label, value, cls, source, note) {
  return { label, value, cls, source, note };
}

/** A documented capability with no public feed behind it. */
export function boundary(label, source, note) {
  return { label, value: null, cls: "B", source, note };
}

/* =========================================================
   PROVENANCE TIERS

   Two vocabularies, deliberately layered.

   The dossier's A/A-ext/B/C/D/S scheme above is the research vocabulary —
   precise, but it asks a viewer to learn six letters before they can read a
   number. The Antarasetu solution doc (§4.2) defines the three words an HQ
   operator or a judge actually needs:

       LIVE       real external feed, arriving now
       MODELED    documented or derived from real information
       SYNTHETIC  prototype placeholder

   So the tier is what the badge says, and the evidence class is what the
   tooltip says. Neither replaces the other: collapsing A (a citable spec)
   and D (a two-point fit) into one badge would lose the distinction the
   dossier exists to preserve, which is why the class travels with it.
========================================================= */

export const PROVENANCE = {
  LIVE: {
    id: "LIVE",
    label: "Live",
    description: "Arriving now from a real external feed.",
    tone: "success",
  },
  MODELED: {
    id: "MODELED",
    label: "Modeled",
    description:
      "Documented in a public source, or derived from one. Not a live reading.",
    // Quiet on purpose: nearly every fact here is modeled, so if this shouted
    // the two tiers that actually need attention would be lost in it.
    tone: "muted",
  },
  SYNTHETIC: {
    id: "SYNTHETIC",
    label: "Synthetic",
    description:
      "Prototype placeholder. Carries no claim about the real station.",
    tone: "warning",
  },
  BOUNDARY: {
    id: "BOUNDARY",
    label: "Not connected",
    description:
      "A real, documented system with no public feed behind it. An integration boundary this platform would close.",
    tone: "muted",
  },
};

const CLASS_TO_TIER = {
  A: "MODELED",
  "A-ext": "MODELED",
  B: "BOUNDARY",
  C: "BOUNDARY",
  D: "MODELED",
  S: "SYNTHETIC",
};

/**
 * Resolve the badge tier for a fact.
 *
 * `live` is a property of the reading, not of the class: "3 x 100 kW CHP" is
 * class A and will never be live, while a temperature from the AWS is class A
 * and is live. Only the caller knows which it is holding.
 */
export function tierFor(cls, live = false) {
  if (live) return PROVENANCE.LIVE;
  return PROVENANCE[CLASS_TO_TIER[cls]] ?? PROVENANCE.BOUNDARY;
}

/** Mark a fact as arriving from a live feed rather than a document. */
export function liveFact(label, value, source, note) {
  return { label, value, cls: "A", live: true, source, note };
}
